// ─── Phase 3: Symptom Checker + History ───────────────────────────────────────
// Run: npx vitest run tests/phase3.test.ts
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
  containsNone,
  type AuthSession,
} from "./helpers";

// Import pure triage logic — tests run without a server
import {
  SYMPTOMS,
  computeTriage,
  evaluateTriage,
  detectSymptom,
  detectAllKeywords,
  getQuestions,
  buildTranscript,
} from "../lib/symptom/triage";

let session: AuthSession;
let cookie: string;

beforeAll(async () => {
  session = await signIn();
  cookie = buildCookie(session);
});

// ─── 1. Triage logic (pure unit tests — no server) ───────────────────────────

describe("1 · Triage logic (unit)", () => {
  test("all 8 symptoms are defined", () => {
    expect(SYMPTOMS).toHaveLength(8);
  });

  test("each symptom has exactly 3 follow-up questions", () => {
    for (const s of SYMPTOMS) {
      expect(s.followUps, `${s.id} should have 3 followUps`).toHaveLength(3);
    }
  });

  test("chest_pain: all yes → red triage (computeTriage compat)", () => {
    const s = SYMPTOMS.find((x) => x.id === "chest_pain")!;
    const answers = Object.fromEntries(s.followUps.map((f) => [f.id, true]));
    expect(computeTriage(s, answers)).toBe("red");
  });

  test("chest_pain: all no → default yellow (computeTriage compat)", () => {
    const s = SYMPTOMS.find((x) => x.id === "chest_pain")!;
    const answers = Object.fromEntries(s.followUps.map((f) => [f.id, false]));
    expect(computeTriage(s, answers)).toBe("yellow");
  });

  test("headache: all yes → red triage", () => {
    const s = SYMPTOMS.find((x) => x.id === "headache")!;
    const answers = Object.fromEntries(s.followUps.map((f) => [f.id, true]));
    expect(computeTriage(s, answers)).toBe("red");
  });

  test("headache: all no → green (default)", () => {
    const s = SYMPTOMS.find((x) => x.id === "headache")!;
    const answers = Object.fromEntries(s.followUps.map((f) => [f.id, false]));
    expect(computeTriage(s, answers)).toBe("green");
  });

  test("fever: seizure yes → red", () => {
    const s = SYMPTOMS.find((x) => x.id === "fever")!;
    const seizureFu = s.followUps.find((f) => f.id === "seizure")!;
    const answers: Record<string, boolean> = {};
    for (const fu of s.followUps) answers[fu.id] = false;
    answers[seizureFu.id] = true;
    expect(computeTriage(s, answers)).toBe("red");
  });

  test("fall: bleeding yes → red", () => {
    const s = SYMPTOMS.find((x) => x.id === "fall")!;
    const bleedFu = s.followUps.find((f) => f.id === "bleeding")!;
    const answers = Object.fromEntries(s.followUps.map((f) => [f.id, false]));
    answers[bleedFu.id] = true;
    expect(computeTriage(s, answers)).toBe("red");
  });

  test("nausea: blood in vomit yes → red", () => {
    const s = SYMPTOMS.find((x) => x.id === "nausea")!;
    const bloodFu = s.followUps.find((f) => f.id === "blood")!;
    const answers = Object.fromEntries(s.followUps.map((f) => [f.id, false]));
    answers[bloodFu.id] = true;
    expect(computeTriage(s, answers)).toBe("red");
  });

  test("other: severe pain yes → red", () => {
    const s = SYMPTOMS.find((x) => x.id === "other")!;
    const painFu = s.followUps.find((f) => f.id === "severe_pain")!;
    const answers = Object.fromEntries(s.followUps.map((f) => [f.id, false]));
    answers[painFu.id] = true;
    expect(computeTriage(s, answers)).toBe("red");
  });

  test("other: lasting yes but no severe → yellow", () => {
    const s = SYMPTOMS.find((x) => x.id === "other")!;
    const lastingFu = s.followUps.find((f) => f.id === "lasting")!;
    const answers = Object.fromEntries(s.followUps.map((f) => [f.id, false]));
    answers[lastingFu.id] = true;
    expect(computeTriage(s, answers)).toBe("yellow");
  });

  test("buildTranscript includes symptom label and Q&A lines", () => {
    const s = SYMPTOMS.find((x) => x.id === "fever")!;
    const answers = Object.fromEntries(s.followUps.map((f) => [f.id, false]));
    const transcript = buildTranscript(s, answers);
    expect(transcript).toContain("Fever");
    expect(transcript).toContain("Q:");
    expect(transcript).toContain("→ No");
  });

  test("computeTriage: red always wins when triggered", () => {
    for (const s of SYMPTOMS) {
      const allYes = Object.fromEntries(s.followUps.map((f) => [f.id, true]));
      const hasRedTrigger = s.followUps.some((f) => f.yesTriggersLevel === "red");
      if (hasRedTrigger) {
        expect(computeTriage(s, allYes)).toBe("red");
      }
    }
  });
});

// ─── 2. evaluateTriage — yes/no/sometimes ────────────────────────────────────

describe("2 · evaluateTriage (yes/no/sometimes)", () => {
  test("evaluateTriage: 'yes' to red trigger → red", () => {
    // chest_pain, first followUp triggers red on yes
    const s = SYMPTOMS.find((x) => x.id === "chest_pain")!;
    const fu = s.followUps.find((f) => f.yesTriggersLevel === "red")!;
    const answers: Record<string, "yes" | "no" | "sometimes"> = {};
    for (const f of s.followUps) answers[f.id] = "no";
    answers[fu.id] = "yes";
    expect(evaluateTriage("chest_pain", answers)).toBe("red");
  });

  test("evaluateTriage: 'sometimes' to red trigger → does NOT produce red (at most yellow)", () => {
    const s = SYMPTOMS.find((x) => x.id === "chest_pain")!;
    const redFu = s.followUps.find((f) => f.yesTriggersLevel === "red")!;
    const answers: Record<string, "yes" | "no" | "sometimes"> = {};
    for (const f of s.followUps) answers[f.id] = "no";
    answers[redFu.id] = "sometimes";
    const result = evaluateTriage("chest_pain", answers);
    expect(result).not.toBe("red");
  });

  test("evaluateTriage: 'sometimes' to yellow trigger → yellow", () => {
    const s = SYMPTOMS.find((x) => x.id === "fever")!;
    const yellowFu = s.followUps.find((f) => f.yesTriggersLevel === "yellow")!;
    const answers: Record<string, "yes" | "no" | "sometimes"> = {};
    for (const f of s.followUps) answers[f.id] = "no";
    answers[yellowFu.id] = "sometimes";
    expect(evaluateTriage("fever", answers)).toBe("yellow");
  });

  test("evaluateTriage: all 'no' → default level", () => {
    for (const s of SYMPTOMS) {
      const answers: Record<string, "yes" | "no" | "sometimes"> =
        Object.fromEntries(s.followUps.map((f) => [f.id, "no"]));
      expect(evaluateTriage(s.id, answers)).toBe(s.defaultLevel);
    }
  });

  test("evaluateTriage: unknown symptomId → green (safe fallback)", () => {
    expect(evaluateTriage("unknown_id", {})).toBe("green");
  });
});

// ─── 3. detectSymptom ────────────────────────────────────────────────────────

describe("3 · detectSymptom (transcript → symptom)", () => {
  test("'I have chest pain' → chest_pain", () => {
    expect(detectSymptom("I have chest pain")?.id).toBe("chest_pain");
  });

  test("'I feel dizzy and lightheaded' → dizziness", () => {
    expect(detectSymptom("I feel dizzy and lightheaded")?.id).toBe("dizziness");
  });

  test("'I have a headache' → headache", () => {
    expect(detectSymptom("I have a headache")?.id).toBe("headache");
  });

  test("'I have a fever' → fever", () => {
    expect(detectSymptom("I have a fever")?.id).toBe("fever");
  });

  test("'I fell down and hurt my arm' → fall", () => {
    expect(detectSymptom("I fell down and hurt my arm")?.id).toBe("fall");
  });

  test("'I feel like vomiting' → nausea", () => {
    expect(detectSymptom("I feel like vomiting")?.id).toBe("nausea");
  });

  test("'I have trouble breathing' → breathlessness", () => {
    expect(detectSymptom("I have trouble breathing")?.id).toBe("breathlessness");
  });

  test("unrecognized transcript → null (no-symptom path)", () => {
    expect(detectSymptom("everything is fine today")).toBeNull();
    expect(detectSymptom("")).toBeNull();
  });

  test("multi-symptom: chest pain + headache → chest_pain (higher severity wins)", () => {
    const result = detectSymptom("I have chest pain and a headache");
    expect(result?.id).toBe("chest_pain");
  });

  test("multi-symptom: breathlessness + fever → breathlessness (higher severity wins)", () => {
    const result = detectSymptom("I have trouble breathing and also a fever");
    expect(result?.id).toBe("breathlessness");
  });
});

// ─── 4. detectAllKeywords ────────────────────────────────────────────────────

describe("4 · detectAllKeywords", () => {
  test("returns all matched symptom IDs", () => {
    const kw = detectAllKeywords("I have chest pain and feel dizzy");
    expect(kw).toContain("chest_pain");
    expect(kw).toContain("dizziness");
  });

  test("empty transcript → empty array", () => {
    expect(detectAllKeywords("")).toHaveLength(0);
  });
});

// ─── 5. getQuestions ─────────────────────────────────────────────────────────

describe("5 · getQuestions", () => {
  test("returns 3 questions for chest_pain", () => {
    expect(getQuestions("chest_pain")).toHaveLength(3);
  });

  test("returns 3 questions for each defined symptom", () => {
    for (const s of SYMPTOMS) {
      expect(getQuestions(s.id)).toHaveLength(3);
    }
  });

  test("returns empty array for unknown symptomId", () => {
    expect(getQuestions("does_not_exist")).toHaveLength(0);
  });
});

// ─── 6. Symptom page (HTTP) ───────────────────────────────────────────────────

describe("6 · Symptom page (HTTP)", () => {
  test("GET /symptom → 200 when authenticated", async () => {
    const { status } = await fetchPage("/symptom", cookie);
    expect(status).toBe(200);
  });

  test("GET /symptom unauthenticated → redirects to /login", async () => {
    const location = await fetchRedirect("/symptom");
    expect(location).toMatch(/\/login/);
  });

  test("/symptom renders voice capture UI", async () => {
    const { html } = await fetchPage("/symptom", cookie);
    const lowerHtml = html.toLowerCase();
    // Should show the voice/text capture prompt or feel content
    const hasUI =
      lowerHtml.includes("feel") ||
      lowerHtml.includes("symptom") ||
      lowerHtml.includes("speak") ||
      lowerHtml.includes("microphone") ||
      lowerHtml.includes("type") ||
      lowerHtml.includes("tell us");
    expect(hasUI).toBe(true);
  });

  test("no forbidden medical advice words on /symptom", async () => {
    const { html } = await fetchPage("/symptom", cookie);
    const forbidden = containsNone(html, ["diagnose", "cure", "treat", "prescribe"]);
    expect(forbidden, `Forbidden words: ${forbidden.join(", ")}`).toHaveLength(0);
  });
});

// ─── 7. History page (HTTP) ──────────────────────────────────────────────────

describe("7 · History page (HTTP)", () => {
  test("GET /history → 200 when authenticated", async () => {
    const { status } = await fetchPage("/history", cookie);
    expect(status).toBe(200);
  });

  test("GET /history unauthenticated → redirects to /login", async () => {
    const location = await fetchRedirect("/history");
    expect(location).toMatch(/\/login/);
  });

  test("/history page has history content or empty state", async () => {
    const { html } = await fetchPage("/history", cookie);
    const lowerHtml = html.toLowerCase();
    const hasContent =
      lowerHtml.includes("history") ||
      lowerHtml.includes("session") ||
      lowerHtml.includes("symptom") ||
      lowerHtml.includes("no symptom");
    expect(hasContent).toBe(true);
  });

  test("no forbidden medical advice words on /history", async () => {
    const { html } = await fetchPage("/history", cookie);
    const forbidden = containsNone(html, ["diagnose", "cure", "treat", "prescribe"]);
    expect(forbidden, `Forbidden words: ${forbidden.join(", ")}`).toHaveLength(0);
  });
});

// ─── 8. symptom_sessions DB ──────────────────────────────────────────────────

describe("8 · symptom_sessions DB", () => {
  let insertedId: string | null = null;

  test("anon query to symptom_sessions returns empty (RLS)", async () => {
    const rows = await fetch(
      `${SUPABASE_URL}/rest/v1/symptom_sessions?select=id`,
      { headers: { apikey: SUPABASE_KEY } }
    ).then((r) => r.json());
    expect(Array.isArray(rows)).toBe(true);
    expect((rows as unknown[]).length).toBe(0);
  });

  test("auth can insert a symptom session (green)", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/symptom_sessions`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: ADMIN_USER_ID,
        profile_id: PROFILE_ID,
        transcript: "Symptom: Headache\nQ: Worst headache? → No",
        detected_symptom: "Headache",
        all_keywords: ["headache"],
        answers: { worst_ever: "no", stiff_neck: "no", sudden: "no" },
        triage_level: "green",
        triage_label: "Monitor at home",
        action_taken: null,
      }),
    });
    expect(res.ok).toBe(true);
    const data = (await res.json()) as Array<{ id: string }>;
    insertedId = data[0]?.id ?? null;
    expect(insertedId).toBeTruthy();
  });

  test("auth can insert a session with no detected_symptom (no-symptom path)", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/symptom_sessions`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: ADMIN_USER_ID,
        profile_id: PROFILE_ID,
        transcript: "I feel strange",
        detected_symptom: null,
        all_keywords: [],
        answers: {},
        triage_level: null,
        triage_label: "No symptom detected",
        action_taken: null,
      }),
    });
    expect(res.ok).toBe(true);
  });

  test("auth can read own symptom session", async () => {
    if (!insertedId) return;
    const rows = await fetch(
      `${SUPABASE_URL}/rest/v1/symptom_sessions?id=eq.${insertedId}&select=id,triage_level`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    ).then((r) => r.json()) as Array<{ id: string; triage_level: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].triage_level).toBe("green");
  });

  test("same symptom twice in one day → both rows saved (no uniqueness constraint)", async () => {
    const countBefore = await sbCount("symptom_sessions", session.accessToken);
    // Insert duplicate session
    await fetch(`${SUPABASE_URL}/rest/v1/symptom_sessions`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: ADMIN_USER_ID,
        profile_id: PROFILE_ID,
        transcript: "Symptom: Headache again",
        detected_symptom: "Headache",
        all_keywords: ["headache"],
        answers: {},
        triage_level: "green",
        triage_label: "Monitor at home",
        action_taken: null,
      }),
    });
    const countAfter = await sbCount("symptom_sessions", session.accessToken);
    expect(countAfter).toBe(countBefore + 1);
  });
});

// ─── 9. Full navigation regression ───────────────────────────────────────────

describe("9 · Full navigation regression (Phase 1 + 2 + 3)", () => {
  const routes = [
    "/",
    "/medicines",
    "/medicines/history",
    "/profile",
    "/symptom",
    "/history",
  ];

  for (const route of routes) {
    test(`GET ${route} → 200 when authenticated`, async () => {
      const { status } = await fetchPage(route, cookie);
      expect(status).toBe(200);
    });
  }

  for (const route of routes) {
    test(`GET ${route} → redirects to /login when unauthenticated`, async () => {
      const location = await fetchRedirect(route);
      expect(location, `${route} should redirect`).toMatch(/\/login/);
    });
  }
});

// ─── 10. Phase 3 Acceptance Criteria ─────────────────────────────────────────

describe("10 · Phase 3 Acceptance Criteria", () => {
  test("AC-1: /symptom and /history pages return 200", async () => {
    const [s, h] = await Promise.all([
      fetchPage("/symptom", cookie),
      fetchPage("/history", cookie),
    ]);
    expect(s.status).toBe(200);
    expect(h.status).toBe(200);
  });

  test("AC-2: evaluateTriage only ever returns green/yellow/red", () => {
    for (const symptom of SYMPTOMS) {
      const allYes = Object.fromEntries(symptom.followUps.map((f) => [f.id, "yes" as const]));
      const allNo  = Object.fromEntries(symptom.followUps.map((f) => [f.id, "no" as const]));
      const allSometimes = Object.fromEntries(symptom.followUps.map((f) => [f.id, "sometimes" as const]));
      expect(["green", "yellow", "red"]).toContain(evaluateTriage(symptom.id, allYes));
      expect(["green", "yellow", "red"]).toContain(evaluateTriage(symptom.id, allNo));
      expect(["green", "yellow", "red"]).toContain(evaluateTriage(symptom.id, allSometimes));
    }
  });

  test("AC-3: 'sometimes' never produces red", () => {
    for (const symptom of SYMPTOMS) {
      const allSometimes = Object.fromEntries(symptom.followUps.map((f) => [f.id, "sometimes" as const]));
      const result = evaluateTriage(symptom.id, allSometimes);
      expect(result, `${symptom.id} with all sometimes should not be red`).not.toBe("red");
    }
  });

  test("AC-4: detectSymptom returns null for unrecognized transcripts", () => {
    expect(detectSymptom("I am feeling great today")).toBeNull();
    expect(detectSymptom("hello")).toBeNull();
  });

  test("AC-5: detectSymptom identifies all 7 named symptoms from keywords", () => {
    const samples: Record<string, string> = {
      chest_pain: "my chest hurts",
      breathlessness: "I can't breathe",
      headache: "terrible headache",
      fever: "I have a fever",
      dizziness: "I feel dizzy",
      nausea: "I want to vomit",
      fall: "I fell and got injured",
    };
    for (const [id, text] of Object.entries(samples)) {
      expect(detectSymptom(text)?.id, `"${text}" should detect ${id}`).toBe(id);
    }
  });

  test("AC-6: RLS blocks anon from reading symptom_sessions", async () => {
    const rows = await fetch(
      `${SUPABASE_URL}/rest/v1/symptom_sessions?select=id`,
      { headers: { apikey: SUPABASE_KEY } }
    ).then((r) => r.json());
    expect((rows as unknown[]).length).toBe(0);
  });

  test("AC-7: copy rules — no forbidden words on /symptom and /history", async () => {
    const forbidden = ["diagnose", "cure", "treat", "prescribe"];
    const [s, h] = await Promise.all([
      fetchPage("/symptom", cookie),
      fetchPage("/history", cookie),
    ]);
    expect(containsNone(s.html, forbidden)).toHaveLength(0);
    expect(containsNone(h.html, forbidden)).toHaveLength(0);
  });

  test("AC-8: engine is pure (no API calls) — evaluateTriage is synchronous", () => {
    const result = evaluateTriage("headache", { worst_ever: "yes", stiff_neck: "no", sudden: "no" });
    expect(typeof result).toBe("string");
    expect(["green", "yellow", "red"]).toContain(result);
  });
});
