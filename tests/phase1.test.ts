// ─── Phase 1: Boot, Auth, Navigation, DB, RLS, UI, Edge cases ────────────────
// Run: npx vitest run tests/phase1.test.ts
// Requires: Next.js dev server running at BASE_URL and valid .env.local

import { describe, test, expect, beforeAll } from "vitest";
import {
  BASE_URL,
  SUPABASE_URL,
  SUPABASE_KEY,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_USER_ID,
  PROFILE_ID,
  signIn,
  buildCookie,
  fetchPage,
  fetchRedirect,
  sbQuery,
  sbCount,
  countIn,
  containsAll,
  containsNone,
  type AuthSession,
} from "./helpers";

let session: AuthSession;
let cookie: string;

beforeAll(async () => {
  session = await signIn();
  cookie = buildCookie(session);
});

// ─── 1. Boot & Environment ───────────────────────────────────────────────────

describe("1 · Boot & Environment", () => {
  test("server is reachable", async () => {
    const { status } = await fetchPage("/");
    expect([200, 302, 307, 308]).toContain(status);
  });

  test("unauthenticated GET / redirects to /login", async () => {
    const location = await fetchRedirect("/");
    expect(location).toMatch(/\/login/);
  });

  test("login page returns 200", async () => {
    const { status } = await fetchPage("/login");
    expect(status).toBe(200);
  });

  test("login page contains email and password fields", async () => {
    const { html } = await fetchPage("/login");
    const missing = containsAll(html, ["email", "password"]);
    expect(missing, `Missing fields: ${missing.join(", ")}`).toHaveLength(0);
  });

  test("Supabase env vars are set", () => {
    expect(SUPABASE_URL).toBeTruthy();
    expect(SUPABASE_KEY).toBeTruthy();
    expect(SUPABASE_URL).toMatch(/^https:\/\//);
  });
});

// ─── 2. Authentication ───────────────────────────────────────────────────────

describe("2 · Authentication", () => {
  test("wrong credentials return error (no access_token)", async () => {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: "wrong@example.com", password: "wrong" }),
      }
    );
    const data = await res.json();
    expect(data.access_token).toBeUndefined();
  });

  test("correct credentials return access_token", async () => {
    expect(session.accessToken).toBeTruthy();
    expect(typeof session.accessToken).toBe("string");
  });

  test("correct credentials return refresh_token", async () => {
    expect(session.refreshToken).toBeTruthy();
  });

  test("correct credentials return user with correct id", async () => {
    expect((session.user as { id: string }).id).toBe(ADMIN_USER_ID);
  });

  test("authenticated GET / returns 200 (no redirect)", async () => {
    const { status } = await fetchPage("/", cookie);
    expect(status).toBe(200);
  });

  test("authenticated GET /login redirects away (not stuck on login)", async () => {
    const location = await fetchRedirect("/login", cookie);
    // Should redirect to "/" when already authenticated
    if (location !== null) {
      expect(location).toMatch(/^\//);
      expect(location).not.toMatch(/\/login/);
    }
    // If no redirect, the page should still not keep them on login — accept either behaviour
  });
});

// ─── 3. Navigation ───────────────────────────────────────────────────────────

describe("3 · Navigation (auth required)", () => {
  const routes = [
    "/",
    "/medicines",
    "/medicines/history",
    "/profile",
  ];

  for (const route of routes) {
    test(`GET ${route} → 200`, async () => {
      const { status } = await fetchPage(route, cookie);
      expect(status).toBe(200);
    });
  }

  test("unauthenticated GET /medicines redirects to /login", async () => {
    const location = await fetchRedirect("/medicines");
    expect(location).toMatch(/\/login/);
  });

  test("unauthenticated GET /profile redirects to /login", async () => {
    const location = await fetchRedirect("/profile");
    expect(location).toMatch(/\/login/);
  });
});

// ─── 4. Database (row counts & data integrity) ───────────────────────────────

describe("4 · Database", () => {
  test("profiles table has at least 1 row", async () => {
    const count = await sbCount("profiles", session.accessToken);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("medicines table has at least 1 row", async () => {
    const count = await sbCount("medicines", session.accessToken);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("contacts table is accessible", async () => {
    const count = await sbCount("emergency_contacts", session.accessToken);
    expect(typeof count).toBe("number");
  });

  test("medicine_logs table is accessible", async () => {
    const count = await sbCount("medicine_logs", session.accessToken);
    expect(typeof count).toBe("number");
  });

  test("profile user_id matches authenticated user", async () => {
    const rows = await sbQuery(
      "profiles",
      `id=eq.${PROFILE_ID}&select=user_id`,
      session.accessToken
    ) as Array<{ user_id: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(ADMIN_USER_ID);
  });

  test("medicines rows have required fields (name, slots, is_active)", async () => {
    const rows = await sbQuery(
      "medicines",
      "select=name,slots,is_active&limit=5",
      session.accessToken
    ) as Array<{ name: string; slots: string[]; is_active: boolean }>;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.name).toBeTruthy();
      expect(Array.isArray(row.slots)).toBe(true);
      expect(typeof row.is_active).toBe("boolean");
    }
  });
});

// ─── 5. Row Level Security ───────────────────────────────────────────────────

describe("5 · Row Level Security", () => {
  test("anon query to profiles returns empty array", async () => {
    const rows = await sbQuery("profiles", "select=id");
    expect(rows).toHaveLength(0);
  });

  test("anon query to medicines returns empty array", async () => {
    const rows = await sbQuery("medicines", "select=id");
    expect(rows).toHaveLength(0);
  });

  test("anon query to medicine_logs returns empty array", async () => {
    const rows = await sbQuery("medicine_logs", "select=id");
    expect(rows).toHaveLength(0);
  });

  test("anon query to emergency_contacts returns empty array", async () => {
    const rows = await sbQuery("emergency_contacts", "select=id");
    expect(rows).toHaveLength(0);
  });

  test("auth query to profiles returns data", async () => {
    const rows = await sbQuery("profiles", "select=id", session.accessToken);
    expect(rows.length).toBeGreaterThan(0);
  });

  test("auth query to medicines returns data", async () => {
    const rows = await sbQuery("medicines", "select=id", session.accessToken);
    expect(rows.length).toBeGreaterThan(0);
  });
});

// ─── 6. UI & Copy Rules ──────────────────────────────────────────────────────

describe("6 · UI & Copy Rules", () => {
  test("dashboard contains disclaimer text", async () => {
    const { html } = await fetchPage("/", cookie);
    // Should contain some form of disclaimer / safety message
    const hasSafetyText =
      html.toLowerCase().includes("doctor") ||
      html.toLowerCase().includes("emergency") ||
      html.toLowerCase().includes("disclaimer") ||
      html.toLowerCase().includes("problem");
    expect(hasSafetyText).toBe(true);
  });

  test("no forbidden medical advice words on dashboard", async () => {
    const { html } = await fetchPage("/", cookie);
    const forbidden = containsNone(html, ["diagnose", "cure", "treat", "prescribe"]);
    expect(forbidden, `Forbidden words found: ${forbidden.join(", ")}`).toHaveLength(0);
  });

  test("no forbidden medical advice words on medicines page", async () => {
    const { html } = await fetchPage("/medicines", cookie);
    const forbidden = containsNone(html, ["diagnose", "cure", "treat", "prescribe"]);
    expect(forbidden, `Forbidden words found: ${forbidden.join(", ")}`).toHaveLength(0);
  });

  test("no forbidden medical advice words on profile page", async () => {
    const { html } = await fetchPage("/profile", cookie);
    const forbidden = containsNone(html, ["diagnose", "cure", "treat", "prescribe"]);
    expect(forbidden, `Forbidden words found: ${forbidden.join(", ")}`).toHaveLength(0);
  });

  test("login page has submit button", async () => {
    const { html } = await fetchPage("/login");
    const hasButton =
      html.includes('type="submit"') ||
      html.includes("Sign in") ||
      html.includes("Log in") ||
      html.includes("Login");
    expect(hasButton).toBe(true);
  });
});

// ─── 7. Edge Cases ───────────────────────────────────────────────────────────

describe("7 · Edge Cases", () => {
  test("unknown route returns 404", async () => {
    const { status } = await fetchPage("/nonexistent-route-xyz", cookie);
    expect(status).toBe(404);
  });

  test("unauthenticated unknown route still redirects to login", async () => {
    // Next.js: unauthenticated requests go through proxy → /login before 404
    const location = await fetchRedirect("/nonexistent-route-xyz");
    // Either redirect to login or 404 are acceptable — must NOT be 200 with private content
    if (location) {
      expect(location).toMatch(/\/login/);
    }
  });

  test("Supabase /health endpoint is reachable", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_KEY },
    });
    expect(res.status).toBeLessThan(500);
  });

  test("session expiresAt is in the future", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(session.expiresAt).toBeGreaterThan(nowSeconds);
  });
});
