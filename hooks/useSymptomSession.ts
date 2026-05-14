"use client";

import { useReducer } from "react";
import type { SymptomDef, AnswerMap } from "@/lib/symptom/triage";

// ─── State machine ────────────────────────────────────────────────────────────
// idle → recording → confirming → questions → result
//      ↘ text_input ↗ (fallback when speech unsupported)
//                    ↓ (no symptom detected)
//                 no_symptom

export type SessionStep =
  | { step: "idle" }
  | { step: "recording" }
  | { step: "text_input" }
  | { step: "confirming"; transcript: string }
  | { step: "no_symptom"; transcript: string }
  | { step: "questions"; symptom: SymptomDef; transcript: string; questionIndex: number; answers: AnswerMap }
  | { step: "result"; symptom: SymptomDef; transcript: string; answers: AnswerMap };

type Action =
  | { type: "START_RECORDING" }
  | { type: "START_TEXT_INPUT" }
  | { type: "CONFIRM_TRANSCRIPT"; transcript: string }
  | { type: "SYMPTOM_DETECTED"; symptom: SymptomDef; transcript: string }
  | { type: "NO_SYMPTOM_DETECTED"; transcript: string }
  | { type: "ANSWER_QUESTION"; answerId: string; value: "yes" | "no" | "sometimes" }
  | { type: "NEXT_QUESTION" }
  | { type: "GO_BACK" }
  | { type: "RETRY" }
  | { type: "RESET" };

function reducer(state: SessionStep, action: Action): SessionStep {
  switch (action.type) {
    case "START_RECORDING":
      return { step: "recording" };

    case "START_TEXT_INPUT":
      return { step: "text_input" };

    case "CONFIRM_TRANSCRIPT":
      // Caller resolves symptom detection and dispatches SYMPTOM_DETECTED or NO_SYMPTOM
      return { step: "confirming", transcript: action.transcript };

    case "SYMPTOM_DETECTED":
      return {
        step: "questions",
        symptom: action.symptom,
        transcript: action.transcript,
        questionIndex: 0,
        answers: {},
      };

    case "NO_SYMPTOM_DETECTED":
      return { step: "no_symptom", transcript: action.transcript };

    case "ANSWER_QUESTION": {
      if (state.step !== "questions") return state;
      const newAnswers: AnswerMap = {
        ...state.answers,
        [action.answerId]: action.value,
      };
      const nextIndex = state.questionIndex + 1;
      const hasMore = nextIndex < state.symptom.followUps.length;
      if (hasMore) {
        return { ...state, answers: newAnswers, questionIndex: nextIndex };
      }
      return {
        step: "result",
        symptom: state.symptom,
        transcript: state.transcript,
        answers: newAnswers,
      };
    }

    case "GO_BACK": {
      if (state.step === "questions") {
        if (state.questionIndex === 0) {
          return { step: "confirming", transcript: state.transcript };
        }
        return { ...state, questionIndex: state.questionIndex - 1 };
      }
      if (state.step === "result") {
        return {
          step: "questions",
          symptom: state.symptom,
          transcript: state.transcript,
          questionIndex: state.symptom.followUps.length - 1,
          answers: state.answers,
        };
      }
      if (state.step === "confirming" || state.step === "no_symptom") {
        return { step: "recording" };
      }
      return { step: "idle" };
    }

    case "RETRY":
      return { step: "idle" };

    case "RESET":
      return { step: "idle" };

    default:
      return state;
  }
}

export function useSymptomSession() {
  const [state, dispatch] = useReducer(reducer, { step: "idle" });
  return { state, dispatch };
}
