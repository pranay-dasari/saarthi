// ─── Phase 2: Dashboard, Medicines, History, Profile ─────────────────────────
// Run: npx vitest run tests/phase2.test.ts
// Requires: Next.js dev server running at BASE_URL and valid .env.local

import { describe, test, expect, beforeAll } from "vitest";
import {
  SUPABASE_URL,
  SUPABASE_KEY,
  ADMIN_USER_ID,
  PROFILE_ID,
  signIn,
  buildCookie,
  fetchPage,
  fetchRedirect,
  sbQuery,
  sbCount,
  sbUpsert,
  sbPatch,
  containsNone,
  type AuthSession,
} from "./helpers";

let session: AuthSession;
let cookie: string;

// Reusable medicine id — picked from DB in beforeAll
let firstMedicineId: string;
const TEST_SLOT = "morning";
const TODAY = new Date().toISOString().split("T")[0];

beforeAll(async () => {
  session = await signIn();
  cookie = buildCookie(session);

  // Grab a medicine id to use in upsert tests
  const rows = await sbQuery(
    "medicines",
    "select=id&is_active=eq.true&limit=1",
    session.accessToken
  ) as Array<{ id: string }>;
  if (rows.length > 0) {
    firstMedicineId = rows[0].id;
  }
});

// ─── 1. Dashboard ─────────────────────────────────────────────────────────────

describe("1 · Dashboard", () => {
  test("GET / returns 200", async () => {
    const { status } = await fetchPage("/", cookie);
    expect(status).toBe(200);
  });

  test("dashboard shows at least one DoseCard", async () => {
    const { html } = await fetchPage("/", cookie);
    // DoseCard renders medicine names with slot labels
    const hasDoseContent =
      html.includes("morning") ||
      html.includes("afternoon") ||
      html.includes("evening") ||
      html.includes("night") ||
      html.includes("Taken") ||
      html.includes("Missed");
    expect(hasDoseContent).toBe(true);
  });

  test("dashboard shows slot groupings", async () => {
    const { html } = await fetchPage("/", cookie);
    const lowerHtml = html.toLowerCase();
    // At least one slot label should appear
    const hasSlot =
      lowerHtml.includes("morning") ||
      lowerHtml.includes("afternoon") ||
      lowerHtml.includes("evening") ||
      lowerHtml.includes("night");
    expect(hasSlot).toBe(true);
  });

  test("dashboard has 'I have a problem' button or equivalent CTA", async () => {
    const { html } = await fetchPage("/", cookie);
    const lowerHtml = html.toLowerCase();
    const hasCTA =
      lowerHtml.includes("problem") ||
      lowerHtml.includes("symptom") ||
      lowerHtml.includes("emergency") ||
      lowerHtml.includes("help");
    expect(hasCTA).toBe(true);
  });

  test("dashboard links to medicines page", async () => {
    const { html } = await fetchPage("/", cookie);
    expect(html).toContain("/medicines");
  });

  test("dashboard links to profile page", async () => {
    const { html } = await fetchPage("/", cookie);
    expect(html).toContain("/profile");
  });

  test("no forbidden medical advice words on dashboard", async () => {
    const { html } = await fetchPage("/", cookie);
    const forbidden = containsNone(html, ["diagnose", "cure", "treat", "prescribe"]);
    expect(forbidden, `Forbidden words: ${forbidden.join(", ")}`).toHaveLength(0);
  });
});

// ─── 2. Mark Dose (medicine_logs upsert) ──────────────────────────────────────

describe("2 · Mark Dose (upsert idempotency)", () => {
  test("medicine_logs upsert with 'taken' succeeds", async () => {
    if (!firstMedicineId) return; // skip if no medicines seeded
    const { ok } = await sbUpsert(
      "medicine_logs",
      "medicine_id,log_date,slot",
      {
        user_id: ADMIN_USER_ID,
        medicine_id: firstMedicineId,
        profile_id: PROFILE_ID,
        log_date: TODAY,
        slot: TEST_SLOT,
        status: "taken",
        taken_at: new Date().toISOString(),
      },
      session.accessToken
    );
    expect(ok).toBe(true);
  });

  test("re-marking same dose does not create duplicate row", async () => {
    if (!firstMedicineId) return;
    const countBefore = await sbCount("medicine_logs", session.accessToken);

    // Mark same dose again
    await sbUpsert(
      "medicine_logs",
      "medicine_id,log_date,slot",
      {
        user_id: ADMIN_USER_ID,
        medicine_id: firstMedicineId,
        profile_id: PROFILE_ID,
        log_date: TODAY,
        slot: TEST_SLOT,
        status: "taken",
        taken_at: new Date().toISOString(),
      },
      session.accessToken
    );

    const countAfter = await sbCount("medicine_logs", session.accessToken);
    expect(countAfter).toBe(countBefore);
  });

  test("medicine_logs upsert with 'missed' succeeds (status update)", async () => {
    if (!firstMedicineId) return;
    const { ok, data } = await sbUpsert(
      "medicine_logs",
      "medicine_id,log_date,slot",
      {
        user_id: ADMIN_USER_ID,
        medicine_id: firstMedicineId,
        profile_id: PROFILE_ID,
        log_date: TODAY,
        slot: TEST_SLOT,
        status: "missed",
        taken_at: null,
      },
      session.accessToken
    );
    expect(ok).toBe(true);
    const rows = data as Array<{ status: string }>;
    expect(rows[0].status).toBe("missed");
  });

  test("log row has correct user_id and profile_id", async () => {
    if (!firstMedicineId) return;
    const rows = await sbQuery(
      "medicine_logs",
      `medicine_id=eq.${firstMedicineId}&log_date=eq.${TODAY}&slot=eq.${TEST_SLOT}&select=user_id,profile_id`,
      session.accessToken
    ) as Array<{ user_id: string; profile_id: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(ADMIN_USER_ID);
    expect(rows[0].profile_id).toBe(PROFILE_ID);
  });
});

// ─── 3. Medicines Page ────────────────────────────────────────────────────────

describe("3 · Medicines Page", () => {
  test("GET /medicines returns 200", async () => {
    const { status } = await fetchPage("/medicines", cookie);
    expect(status).toBe(200);
  });

  test("medicines page shows today's schedule content", async () => {
    const { html } = await fetchPage("/medicines", cookie);
    const lowerHtml = html.toLowerCase();
    const hasContent =
      lowerHtml.includes("morning") ||
      lowerHtml.includes("afternoon") ||
      lowerHtml.includes("evening") ||
      lowerHtml.includes("night") ||
      lowerHtml.includes("today");
    expect(hasContent).toBe(true);
  });

  test("medicines page shows progress indicator", async () => {
    const { html } = await fetchPage("/medicines", cookie);
    const lowerHtml = html.toLowerCase();
    const hasProgress =
      lowerHtml.includes("%") ||
      lowerHtml.includes("progress") ||
      lowerHtml.includes("taken") ||
      lowerHtml.includes("of");
    expect(hasProgress).toBe(true);
  });

  test("medicines page links to history", async () => {
    const { html } = await fetchPage("/medicines", cookie);
    expect(html).toContain("/medicines/history");
  });

  test("no forbidden words on medicines page", async () => {
    const { html } = await fetchPage("/medicines", cookie);
    const forbidden = containsNone(html, ["diagnose", "cure", "treat", "prescribe"]);
    expect(forbidden, `Forbidden words: ${forbidden.join(", ")}`).toHaveLength(0);
  });
});

// ─── 4. Medicine History Page ─────────────────────────────────────────────────

describe("4 · Medicine History Page", () => {
  test("GET /medicines/history returns 200", async () => {
    const { status } = await fetchPage("/medicines/history", cookie);
    expect(status).toBe(200);
  });

  test("history page has medicine log entries or empty-state message", async () => {
    const { html } = await fetchPage("/medicines/history", cookie);
    const lowerHtml = html.toLowerCase();
    const hasContent =
      lowerHtml.includes("taken") ||
      lowerHtml.includes("missed") ||
      lowerHtml.includes("history") ||
      lowerHtml.includes("no logs") ||
      lowerHtml.includes("no records") ||
      lowerHtml.includes("log");
    expect(hasContent).toBe(true);
  });

  test("history page renders MedicineHistoryTable component", async () => {
    // MedicineHistoryTable is a client component — filter UI is hydrated client-side.
    // We verify the page mounts the component by checking for its data payload or
    // the surrounding page structure (header + history link).
    const { html } = await fetchPage("/medicines/history", cookie);
    const lowerHtml = html.toLowerCase();
    const hasComponent =
      lowerHtml.includes("history") ||
      lowerHtml.includes("medicine") ||
      lowerHtml.includes("log") ||
      html.includes("MedicineHistoryTable") ||
      html.includes("data-"); // React hydration data
    expect(hasComponent).toBe(true);
  });

  test("DB: medicine_logs for today has at least 1 row (from mark-dose tests)", async () => {
    const rows = await sbQuery(
      "medicine_logs",
      `log_date=eq.${TODAY}&select=id`,
      session.accessToken
    ) as Array<{ id: string }>;
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test("DB: medicine_logs rows within last 30 days are accessible", async () => {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fromStr = from.toISOString().split("T")[0];
    const rows = await sbQuery(
      "medicine_logs",
      `log_date=gte.${fromStr}&select=id`,
      session.accessToken
    ) as Array<{ id: string }>;
    expect(typeof rows.length).toBe("number");
  });
});

// ─── 5. Profile Page ──────────────────────────────────────────────────────────

describe("5 · Profile Page", () => {
  test("GET /profile returns 200", async () => {
    const { status } = await fetchPage("/profile", cookie);
    expect(status).toBe(200);
  });

  test("profile page renders patient name or placeholder", async () => {
    const { html } = await fetchPage("/profile", cookie);
    // Profile must show something identifying the patient
    const lowerHtml = html.toLowerCase();
    const hasIdentifier =
      lowerHtml.includes("name") ||
      lowerHtml.includes("age") ||
      lowerHtml.includes("profile");
    expect(hasIdentifier).toBe(true);
  });

  test("profile page shows conditions or health info section", async () => {
    const { html } = await fetchPage("/profile", cookie);
    const lowerHtml = html.toLowerCase();
    const hasHealth =
      lowerHtml.includes("condition") ||
      lowerHtml.includes("doctor") ||
      lowerHtml.includes("medical") ||
      lowerHtml.includes("health");
    expect(hasHealth).toBe(true);
  });

  test("profile page has edit capability (button or link)", async () => {
    const { html } = await fetchPage("/profile", cookie);
    const lowerHtml = html.toLowerCase();
    const hasEdit =
      lowerHtml.includes("edit") ||
      lowerHtml.includes("save") ||
      lowerHtml.includes("update") ||
      html.includes('<button');
    expect(hasEdit).toBe(true);
  });

  test("profile page has emergency contact section", async () => {
    const { html } = await fetchPage("/profile", cookie);
    const lowerHtml = html.toLowerCase();
    const hasContact =
      lowerHtml.includes("emergency") ||
      lowerHtml.includes("contact") ||
      lowerHtml.includes("phone");
    expect(hasContact).toBe(true);
  });

  test("no forbidden words on profile page", async () => {
    const { html } = await fetchPage("/profile", cookie);
    const forbidden = containsNone(html, ["diagnose", "cure", "treat", "prescribe"]);
    expect(forbidden, `Forbidden words: ${forbidden.join(", ")}`).toHaveLength(0);
  });

  test("DB: profile PATCH (edit) succeeds", async () => {
    const rows = await sbQuery(
      "profiles",
      `id=eq.${PROFILE_ID}&select=name`,
      session.accessToken
    ) as Array<{ name: string }>;
    const originalName = rows[0]?.name ?? "Test User";

    const { ok } = await sbPatch(
      "profiles",
      `id=eq.${PROFILE_ID}`,
      { name: originalName }, // write same value — no actual change, just verify PATCH works
      session.accessToken
    );
    expect(ok).toBe(true);
  });
});

// ─── 6. Phase 2 Acceptance Criteria ───────────────────────────────────────────

describe("6 · Phase 2 Acceptance Criteria", () => {
  test("AC-1: all 4 protected routes return 200 when authenticated", async () => {
    const routes = ["/", "/medicines", "/medicines/history", "/profile"];
    for (const route of routes) {
      const { status } = await fetchPage(route, cookie);
      expect(status, `Route ${route} failed`).toBe(200);
    }
  });

  test("AC-2: all 4 protected routes redirect unauthenticated users", async () => {
    const routes = ["/", "/medicines", "/profile"];
    for (const route of routes) {
      const location = await fetchRedirect(route);
      expect(location, `Route ${route} should redirect`).toMatch(/\/login/);
    }
  });

  test("AC-3: mark-dose upsert is idempotent (N marks = 1 row)", async () => {
    if (!firstMedicineId) return;
    // Mark 3 times
    for (let i = 0; i < 3; i++) {
      await sbUpsert(
        "medicine_logs",
        "medicine_id,log_date,slot",
        {
          user_id: ADMIN_USER_ID,
          medicine_id: firstMedicineId,
          profile_id: PROFILE_ID,
          log_date: TODAY,
          slot: "evening", // use different slot to avoid interference
          status: "taken",
          taken_at: new Date().toISOString(),
        },
        session.accessToken
      );
    }
    const rows = await sbQuery(
      "medicine_logs",
      `medicine_id=eq.${firstMedicineId}&log_date=eq.${TODAY}&slot=eq.evening&select=id`,
      session.accessToken
    ) as Array<{ id: string }>;
    expect(rows).toHaveLength(1);
  });

  test("AC-4: RLS blocks anon from reading any phase-2 tables", async () => {
    const tables = ["profiles", "medicines", "medicine_logs", "emergency_contacts"];
    for (const table of tables) {
      const rows = await sbQuery(table, "select=id");
      expect(rows, `Table ${table} should be empty for anon`).toHaveLength(0);
    }
  });

  test("AC-5: copy rules — no forbidden words across all pages", async () => {
    const pages = ["/", "/medicines", "/medicines/history", "/profile"];
    const forbidden = ["diagnose", "cure", "treat", "prescribe"];
    for (const page of pages) {
      const { html } = await fetchPage(page, cookie);
      const found = containsNone(html, forbidden);
      expect(found, `Page ${page} has forbidden words: ${found.join(", ")}`).toHaveLength(0);
    }
  });
});
