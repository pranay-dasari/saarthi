"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPills, faPlus, faPen, faCheck, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { BigButton } from "@/components/ui/BigButton";
import { addMedicine, updateMedicine, deactivateMedicine } from "@/app/actions";
import type { Medicine, Slot } from "@/types";

const ALL_SLOTS: { key: Slot; label: string; time: string }[] = [
  { key: "morning",   label: "Morning",   time: "6 AM – 12 PM" },
  { key: "afternoon", label: "Afternoon", time: "12 – 5 PM"    },
  { key: "evening",   label: "Evening",   time: "5 – 8 PM"     },
  { key: "night",     label: "Night",     time: "8 PM – 12 AM" },
];

interface FormState {
  name: string;
  nickname: string;
  dosage: string;
  slots: Slot[];
  instructions: string;
}

const EMPTY_FORM: FormState = {
  name: "", nickname: "", dosage: "", slots: [], instructions: "",
};

interface Props {
  profileId: string;
  medicines: Medicine[];
}

// ─── Slot toggle grid ─────────────────────────────────────────────────────────

function SlotGrid({
  selected,
  onToggle,
}: {
  selected: Slot[];
  onToggle: (s: Slot) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ALL_SLOTS.map(({ key, label, time }) => {
        const on = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className={`flex flex-col items-start px-3 py-2.5 rounded-xl border-2 text-left transition-all
              ${on ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"}`}
          >
            <span className={`text-sm font-semibold ${on ? "text-white" : ""}`}>{label}</span>
            <span className={`text-xs ${on ? "text-blue-100" : "text-gray-400"}`}>{time}</span>
            {on && <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-white mt-1" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Inline form ──────────────────────────────────────────────────────────────

function MedicineForm({
  form,
  setForm,
  error,
  isPending,
  isEditing,
  onSave,
  onCancel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  error: string | null;
  isPending: boolean;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const field = (key: keyof FormState) => (
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  );

  const toggleSlot = (slot: Slot) =>
    setForm((f) => ({
      ...f,
      slots: f.slots.includes(slot)
        ? f.slots.filter((s) => s !== slot)
        : [...f.slots, slot],
    }));

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl px-4 py-4 flex flex-col gap-3">
      <p className="font-bold text-gray-900 text-base">
        {isEditing ? "Edit medicine" : "Add medicine"}
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-gray-600">
          Medicine name <span className="text-red-500">*</span>
        </label>
        <input
          value={form.name}
          onChange={field("name")}
          placeholder="e.g. Metformin"
          className="field-input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-gray-600">
          Pet name / nickname
        </label>
        <input
          value={form.nickname}
          onChange={field("nickname")}
          placeholder="e.g. red tablet, orange bottle tonic"
          className="field-input"
        />
        <p className="text-xs text-gray-400">
          Saarthi uses this in voice reminders
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-gray-600">Dosage</label>
        <input
          value={form.dosage}
          onChange={field("dosage")}
          placeholder="e.g. 500mg, 1 tablet"
          className="field-input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-gray-600">
          When to take <span className="text-red-500">*</span>
        </label>
        <SlotGrid selected={form.slots} onToggle={toggleSlot} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-gray-600">
          Instructions
        </label>
        <input
          value={form.instructions}
          onChange={field("instructions")}
          placeholder="e.g. Take on empty stomach, Take after food"
          className="field-input"
        />
        <p className="text-xs text-gray-400">
          Saarthi reads this aloud as part of the reminder
        </p>
      </div>

      {error && (
        <p className="text-red-600 text-sm font-medium">{error}</p>
      )}

      <div className="flex gap-2 mt-1">
        <BigButton
          variant="primary"
          size="md"
          fullWidth
          disabled={isPending}
          onClick={onSave}
        >
          <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
          {isPending ? "Saving…" : "Save"}
        </BigButton>
        <BigButton
          variant="secondary"
          size="md"
          fullWidth
          disabled={isPending}
          onClick={onCancel}
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          Cancel
        </BigButton>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MedicineManager({ profileId, medicines }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // mode: 'view' | 'adding' | '<medicine-id>' (editing that id)
  const [mode, setMode] = useState<"view" | "adding" | string>("view");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const isAdding = mode === "adding";
  const isEditing = mode !== "view" && mode !== "adding";
  const showForm = isAdding || isEditing;

  function startAdd() {
    setForm(EMPTY_FORM);
    setError(null);
    setMode("adding");
  }

  function startEdit(med: Medicine) {
    setForm({
      name: med.name,
      nickname: med.nickname ?? "",
      dosage: med.dosage ?? "",
      slots: med.slots,
      instructions: med.instructions ?? "",
    });
    setError(null);
    setMode(med.id);
  }

  function cancel() {
    setMode("view");
    setError(null);
  }

  function handleSave() {
    if (!form.name.trim()) {
      setError("Please enter the medicine name.");
      return;
    }
    if (form.slots.length === 0) {
      setError("Please select at least one time slot.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        if (isAdding) {
          await addMedicine(profileId, {
            name: form.name,
            nickname: form.nickname || null,
            dosage: form.dosage || null,
            slots: form.slots,
            notes: null,
            instructions: form.instructions || null,
          });
        } else {
          await updateMedicine(mode, {
            name: form.name,
            nickname: form.nickname || null,
            dosage: form.dosage || null,
            slots: form.slots,
            instructions: form.instructions || null,
            is_active: true,
          });
        }
        setMode("view");
        router.refresh();
      } catch {
        setError("Could not save. Please try again.");
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      try {
        await deactivateMedicine(id);
        router.refresh();
      } catch {
        // silent — DoseCard reflects DB state independently
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FontAwesomeIcon icon={faPills} className="w-5 h-5 text-orange-500" />
          My Medicines
        </h2>
        {!showForm && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 text-blue-600 font-semibold text-sm
                       px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
            Add
          </button>
        )}
      </div>

      {/* Medicine list */}
      {medicines.length === 0 && !showForm && (
        <p className="text-gray-400 text-base">No medicines added yet.</p>
      )}

      {medicines.map((med) => (
        <div
          key={med.id}
          className={`bg-gray-50 rounded-xl px-4 py-3 border-2 transition-colors ${
            isEditing && mode === med.id ? "border-blue-400" : "border-gray-100"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-base leading-tight">
                {med.name}
              </p>
              {med.nickname && (
                <p className="text-sm text-orange-600 font-medium mt-0.5">
                  "{med.nickname}"
                </p>
              )}
              <p className="text-sm text-gray-500 mt-0.5">
                {med.dosage && `${med.dosage} · `}
                {med.slots
                  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                  .join(", ")}
              </p>
              {med.instructions && (
                <p className="text-xs text-blue-600 mt-1 italic">
                  {med.instructions}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() =>
                  isEditing && mode === med.id ? cancel() : startEdit(med)
                }
                aria-label="Edit medicine"
                className="w-9 h-9 flex items-center justify-center rounded-lg
                           bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <FontAwesomeIcon icon={faPen} className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => handleRemove(med.id)}
                disabled={isPending}
                aria-label="Remove medicine"
                className="w-9 h-9 flex items-center justify-center rounded-lg
                           bg-white border border-red-200 hover:bg-red-50 transition-colors
                           disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Inline add/edit form */}
      {showForm && (
        <MedicineForm
          form={form}
          setForm={setForm}
          error={error}
          isPending={isPending}
          isEditing={isEditing}
          onSave={handleSave}
          onCancel={cancel}
        />
      )}
    </div>
  );
}
