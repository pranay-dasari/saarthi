import type { TriageLevel } from "@/types";

// ─── Symptom definitions ─────────────────────────────────────────────────────

export interface FollowUp {
  id: string;
  question: string;
  yesTriggersLevel: TriageLevel;
  // "sometimes" is treated as yes for yellow triggers, no for red triggers
}

export interface SymptomDef {
  id: string;
  label: string;
  emoji: string;
  keywords: string[];   // transcript keywords that map to this symptom
  severity: number;     // 3=red, 2=yellow, 1=green — used for multi-match priority
  followUps: FollowUp[];
  defaultLevel: TriageLevel;
}

export type Answer = "yes" | "no" | "sometimes";
export type AnswerMap = Record<string, Answer>;

export const SYMPTOMS: SymptomDef[] = [
  {
    id: "chest_pain",
    label: "Chest pain",
    emoji: "💔",
    keywords: ["chest pain", "chest", "chest discomfort", "heart pain", "heart ache"],
    severity: 3,
    defaultLevel: "yellow",
    followUps: [
      {
        id: "severe",
        question: "Is the pain severe or crushing?",
        yesTriggersLevel: "red",
      },
      {
        id: "spreading",
        question: "Does it spread to your arm, jaw, or back?",
        yesTriggersLevel: "red",
      },
      {
        id: "sweaty",
        question: "Do you feel breathless or sweaty?",
        yesTriggersLevel: "red",
      },
    ],
  },
  {
    id: "breathlessness",
    label: "Difficulty breathing",
    emoji: "😮‍💨",
    keywords: ["breath", "breathing", "breathless", "breathlessness", "short of breath", "can't breathe", "cannot breathe", "trouble breathing"],
    severity: 3,
    defaultLevel: "yellow",
    followUps: [
      {
        id: "sentence",
        question: "Can you NOT complete a full sentence without stopping?",
        yesTriggersLevel: "red",
      },
      {
        id: "sudden",
        question: "Did it start suddenly in the last hour?",
        yesTriggersLevel: "yellow",
      },
      {
        id: "fever",
        question: "Do you also have a fever?",
        yesTriggersLevel: "yellow",
      },
    ],
  },
  {
    id: "headache",
    label: "Headache",
    emoji: "🤕",
    keywords: ["headache", "head ache", "head pain", "migraine", "head hurts", "my head"],
    severity: 2,
    defaultLevel: "green",
    followUps: [
      {
        id: "worst_ever",
        question: "Is it the worst headache of your life?",
        yesTriggersLevel: "red",
      },
      {
        id: "stiff_neck",
        question: "Do you have a stiff neck or sensitivity to light?",
        yesTriggersLevel: "red",
      },
      {
        id: "sudden",
        question: "Did it start suddenly like a thunderclap?",
        yesTriggersLevel: "red",
      },
    ],
  },
  {
    id: "fever",
    label: "Fever",
    emoji: "🌡️",
    keywords: ["fever", "temperature", "hot", "burning up", "running a temperature", "feel hot"],
    severity: 2,
    defaultLevel: "green",
    followUps: [
      {
        id: "seizure",
        question: "Did you faint or have a seizure?",
        yesTriggersLevel: "red",
      },
      {
        id: "very_high",
        question: "Is your temperature above 103°F (39.5°C)?",
        yesTriggersLevel: "yellow",
      },
      {
        id: "chills",
        question: "Are you shivering with severe chills?",
        yesTriggersLevel: "yellow",
      },
    ],
  },
  {
    id: "dizziness",
    label: "Dizziness",
    emoji: "😵",
    keywords: ["dizzy", "dizziness", "spinning", "lightheaded", "light headed", "vertigo", "giddy"],
    severity: 2,
    defaultLevel: "green",
    followUps: [
      {
        id: "fainted",
        question: "Did you faint or lose consciousness?",
        yesTriggersLevel: "red",
      },
      {
        id: "cant_stand",
        question: "Are you unable to stand or walk normally?",
        yesTriggersLevel: "yellow",
      },
      {
        id: "medication",
        question: "Did this start after taking a new medication?",
        yesTriggersLevel: "yellow",
      },
    ],
  },
  {
    id: "nausea",
    label: "Nausea / vomiting",
    emoji: "🤢",
    keywords: ["nausea", "nauseous", "vomit", "vomiting", "sick", "throw up", "throwing up", "want to vomit"],
    severity: 1,
    defaultLevel: "green",
    followUps: [
      {
        id: "blood",
        question: "Is there blood in the vomit?",
        yesTriggersLevel: "red",
      },
      {
        id: "no_fluids",
        question: "Have you been unable to keep fluids down for 4+ hours?",
        yesTriggersLevel: "yellow",
      },
      {
        id: "stomach_pain",
        question: "Do you have severe stomach pain?",
        yesTriggersLevel: "yellow",
      },
    ],
  },
  {
    id: "fall",
    label: "Fall / injury",
    emoji: "🤸",
    keywords: ["fall", "fell", "fallen", "injury", "injured", "hurt", "accident", "tripped", "stumbled"],
    severity: 2,
    defaultLevel: "green",
    followUps: [
      {
        id: "bleeding",
        question: "Are you bleeding and it won't stop?",
        yesTriggersLevel: "red",
      },
      {
        id: "head_hit",
        question: "Did you hit your head?",
        yesTriggersLevel: "yellow",
      },
      {
        id: "cant_move",
        question: "Can you not move a limb normally?",
        yesTriggersLevel: "yellow",
      },
    ],
  },
  {
    id: "other",
    label: "Something else",
    emoji: "❓",
    keywords: [],   // catch-all — used only when user selects manually
    severity: 1,
    defaultLevel: "green",
    followUps: [
      {
        id: "severe_pain",
        question: "Are you in severe pain (8 or more out of 10)?",
        yesTriggersLevel: "red",
      },
      {
        id: "lasting",
        question: "Has it lasted more than 2 days?",
        yesTriggersLevel: "yellow",
      },
      {
        id: "unusual",
        question: "Does it feel very different from anything before?",
        yesTriggersLevel: "yellow",
      },
    ],
  },
];

// ─── detectSymptom ────────────────────────────────────────────────────────────
// Keyword match against transcript. On multi-match, returns highest severity.
// Returns null if no symptom is detected (triggers no-symptom screen).

export function detectSymptom(transcript: string): SymptomDef | null {
  const lower = transcript.toLowerCase();
  const matched: SymptomDef[] = [];

  for (const symptom of SYMPTOMS) {
    if (symptom.keywords.some((kw) => lower.includes(kw))) {
      matched.push(symptom);
    }
  }

  if (matched.length === 0) return null;

  // Highest severity first; on tie keep declaration order (first matched)
  matched.sort((a, b) => b.severity - a.severity);
  return matched[0];
}

// ─── detectAllSymptoms ────────────────────────────────────────────────────────
// Returns all keyword IDs that matched, for storing in all_keywords.

export function detectAllKeywords(transcript: string): string[] {
  const lower = transcript.toLowerCase();
  return SYMPTOMS.filter((s) =>
    s.keywords.some((kw) => lower.includes(kw))
  ).map((s) => s.id);
}

// ─── getQuestions ─────────────────────────────────────────────────────────────

export function getQuestions(symptomId: string): FollowUp[] {
  return SYMPTOMS.find((s) => s.id === symptomId)?.followUps ?? [];
}

// ─── evaluateTriage ───────────────────────────────────────────────────────────
// "sometimes" counts as yes for yellow triggers but NOT for red triggers.

export function evaluateTriage(
  symptomId: string,
  answers: AnswerMap
): TriageLevel {
  const symptom = SYMPTOMS.find((s) => s.id === symptomId);
  if (!symptom) return "green";

  let worst: TriageLevel = symptom.defaultLevel;

  for (const fu of symptom.followUps) {
    const ans = answers[fu.id];
    if (ans === "yes") {
      if (fu.yesTriggersLevel === "red") return "red";
      if (fu.yesTriggersLevel === "yellow" && worst !== "red") worst = "yellow";
    } else if (ans === "sometimes") {
      // "sometimes" cannot trigger red; it can trigger yellow
      if (fu.yesTriggersLevel === "yellow" && worst !== "red") worst = "yellow";
    }
  }

  return worst;
}

// ─── computeTriage (kept for backwards compat with tests) ────────────────────

export function computeTriage(
  symptom: SymptomDef,
  answers: Record<string, boolean>
): TriageLevel {
  let worst: TriageLevel = symptom.defaultLevel;

  for (const fu of symptom.followUps) {
    if (answers[fu.id] === true) {
      if (fu.yesTriggersLevel === "red") return "red";
      if (fu.yesTriggersLevel === "yellow" && worst !== "red") worst = "yellow";
    }
  }

  return worst;
}

// ─── buildTranscript ──────────────────────────────────────────────────────────

export function buildTranscript(
  symptom: SymptomDef,
  answers: AnswerMap | Record<string, boolean>
): string {
  const lines: string[] = [`Symptom: ${symptom.label}`];
  for (const fu of symptom.followUps) {
    const ans = (answers as Record<string, unknown>)[fu.id];
    if (ans !== undefined) {
      const label = ans === true ? "Yes" : ans === false ? "No" : String(ans);
      lines.push(`Q: ${fu.question} → ${label}`);
    }
  }
  return lines.join("\n");
}
