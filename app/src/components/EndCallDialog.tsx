import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Button, CTAButton } from "./ui/Button";
import type { Database } from "../lib/database.types";

type Outcome = Database["public"]["Enums"]["sales_call_outcome"];

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "closed_won",          label: "Closed — Won 🎉" },
  { value: "follow_up_scheduled", label: "Follow-up Scheduled" },
  { value: "callback_requested",  label: "Callback Requested" },
  { value: "no_decision",         label: "No Decision" },
  { value: "closed_lost",         label: "Closed — Lost" },
  { value: "not_interested",      label: "Not Interested" },
];

const NOTES_KEY_PREFIX      = "llg.callNotes.";
const TRIGGERS_KEY_PREFIX   = "llg.callTriggers.";
const OBJECTIONS_KEY_PREFIX = "llg.callObjections.";
const ACTIVE_KEY            = "llg.activeAssessment.v2";

const inputClass =
  "w-full bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-sm text-body outline-none focus:ring-2 focus:ring-brand";

interface EndCallDialogProps {
  open: boolean;
  callStartedAt: number;
  firmKey: string;
  onDone: () => void;
}

function defaultNextActionFor(outcome: Outcome): string {
  // Local datetime-input string (YYYY-MM-DDTHH:mm), no timezone suffix.
  const d = new Date();
  if (outcome === "callback_requested") {
    d.setDate(d.getDate() + 1);
  } else {
    d.setDate(d.getDate() + 3);
  }
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EndCallDialog({ open, callStartedAt, firmKey, onDone }: EndCallDialogProps) {
  const { user, role } = useAuth();
  const [outcome, setOutcome] = useState<Outcome>("follow_up_scheduled");
  const [packageSold, setPackageSold] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [notes, setNotes] = useState("");
  const [nextActionAt, setNextActionAt] = useState(defaultNextActionFor("follow_up_scheduled"));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOutcome("follow_up_scheduled");
    setPackageSold("");
    setContractValue("");
    setNotes(localStorage.getItem(NOTES_KEY_PREFIX + firmKey) ?? "");
    setNextActionAt(defaultNextActionFor("follow_up_scheduled"));
  }, [open, firmKey]);

  useEffect(() => {
    if (outcome === "follow_up_scheduled" || outcome === "callback_requested") {
      setNextActionAt(defaultNextActionFor(outcome));
    }
  }, [outcome]);

  const needsNextAction = outcome === "follow_up_scheduled" || outcome === "callback_requested";

  if (!open) return null;

  const assessmentId = localStorage.getItem(ACTIVE_KEY);

  const durationSeconds = Math.floor((Date.now() - callStartedAt) / 1000);
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const durationLabel = `${mins}:${secs.toString().padStart(2, "0")}`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const endedAt = new Date().toISOString();
    const finalDuration = Math.floor((Date.now() - callStartedAt) / 1000);
    const contractCents = contractValue ? Math.round(parseFloat(contractValue) * 100) : null;

    let triggersHit: string[] = [];
    try {
      const raw = localStorage.getItem(TRIGGERS_KEY_PREFIX + firmKey);
      triggersHit = raw ? (JSON.parse(raw) as string[]) : [];
    } catch { /* ignore */ }

    let objectionsHit: string[] = [];
    try {
      const raw = localStorage.getItem(OBJECTIONS_KEY_PREFIX + firmKey);
      objectionsHit = raw ? (JSON.parse(raw) as string[]) : [];
    } catch { /* ignore */ }

    const nextActionIso =
      needsNextAction && nextActionAt ? new Date(nextActionAt).toISOString() : null;

    if (assessmentId) {
      // Resolve who's the opener vs closer on this row.
      // - Openers acting on their own lead: opener_id = self, closer_id = null.
      // - Closers / admins on a closer call: opener_id = original creator of
      //   the assessment (so opener stats stay correct), closer_id = self.
      let openerId = user.id;
      let closerId: string | null = null;

      if (role !== "opener") {
        const { data: assessment } = await supabase
          .from("sales_assessments")
          .select("created_by")
          .eq("id", assessmentId)
          .maybeSingle();

        closerId = user.id;
        if (assessment?.created_by) {
          openerId = assessment.created_by;
        }
        // If the assessment lookup failed, fall back to writing the closer as
        // both opener_id and closer_id so we still capture the call.
      }

      await supabase.from("sales_calls").insert({
        assessment_id: assessmentId,
        opener_id: openerId,
        closer_id: closerId,
        started_at: new Date(callStartedAt).toISOString(),
        ended_at: endedAt,
        duration_seconds: finalDuration,
        outcome,
        notes: notes || null,
        package_sold: packageSold || null,
        contract_value_cents: contractCents,
        triggers_hit: triggersHit.length > 0 ? triggersHit : null,
        objections_hit: objectionsHit.length > 0 ? objectionsHit : null,
        next_action_at: nextActionIso,
      });

      void supabase.from("sales_activity").insert({
        actor_id: user.id,
        action: "call.ended",
        target_id: assessmentId,
        target_type: "assessment",
        metadata: {
          outcome,
          duration_seconds: finalDuration,
          contract_value_cents: contractCents,
        },
      });
    }

    localStorage.removeItem(NOTES_KEY_PREFIX + firmKey);
    localStorage.removeItem(TRIGGERS_KEY_PREFIX + firmKey);
    localStorage.removeItem(OBJECTIONS_KEY_PREFIX + firmKey);

    setSaving(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onDone}
        aria-hidden
      />
      <div className="relative w-full max-w-md bg-surface rounded-[12px] shadow-2xl border border-[var(--color-border)] p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-heading">Log Call Outcome</h2>
          <p className="text-xs text-subtle mt-0.5">Duration: {durationLabel}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
              Outcome
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as Outcome)}
              className={inputClass}
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {needsNextAction && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
                {outcome === "callback_requested" ? "Callback by" : "Next follow-up"}
              </label>
              <input
                type="datetime-local"
                value={nextActionAt}
                onChange={(e) => setNextActionAt(e.target.value)}
                required
                className={inputClass}
              />
              <p className="text-2xs text-subtle">
                Surfaces this lead in the Follow-ups view at that time.
              </p>
            </div>
          )}

          {outcome === "closed_won" && (
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
                  Package Sold
                </label>
                <input
                  type="text"
                  value={packageSold}
                  onChange={(e) => setPackageSold(e.target.value)}
                  placeholder="Growth, Full Stack…"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1 w-32">
                <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
                  Value ($)
                </label>
                <input
                  type="number"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Key takeaways from the call…"
              className="w-full bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-sm text-body resize-none outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {!assessmentId && (
            <p className="text-xs text-[var(--color-danger)]">
              No active assessment — outcome will be saved without linking to a firm.
            </p>
          )}

          <div className="flex gap-2 justify-end mt-1">
            <Button variant="neutral" type="button" onClick={onDone} disabled={saving}>
              Skip
            </Button>
            <CTAButton type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save & End Call"}
            </CTAButton>
          </div>
        </form>
      </div>
    </div>
  );
}
