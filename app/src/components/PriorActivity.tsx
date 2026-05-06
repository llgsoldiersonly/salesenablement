import { useEffect, useState } from "react";
import { getCallsForAssessment, type PriorCall, type CallOutcome } from "../lib/assessmentCalls";

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  closed_won: "Won",
  closed_lost: "Lost",
  follow_up_scheduled: "Follow-up",
  no_decision: "No decision",
  not_interested: "Not interested",
  callback_requested: "Callback",
};

const OUTCOME_STYLES: Record<CallOutcome, string> = {
  closed_won: "bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30",
  closed_lost: "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30",
  follow_up_scheduled: "bg-[#6366F1]/15 text-[#4338CA] border-[#6366F1]/30",
  no_decision: "bg-surface text-subtle border-[var(--color-border)]",
  not_interested: "bg-surface text-subtle border-[var(--color-border)]",
  callback_requested: "bg-[#0EA5E9]/15 text-[#0369A1] border-[#0EA5E9]/30",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds < 1) return null;
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

interface PriorActivityProps {
  assessmentId: string;
}

export function PriorActivity({ assessmentId }: PriorActivityProps) {
  const [calls, setCalls] = useState<PriorCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getCallsForAssessment(assessmentId).then((c) => {
      if (cancelled) return;
      setCalls(c);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  if (loading || calls.length === 0) return null;

  const visible = expanded ? calls : calls.slice(0, 1);

  return (
    <div className="bg-[#FFF7ED] border border-[#F59E0B]/30 rounded-[8px] p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">📞</span>
          <h2 className="text-sm font-semibold text-heading">
            Prior Activity ({calls.length} {calls.length === 1 ? "call" : "calls"})
          </h2>
        </div>
        {calls.length > 1 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-2xs uppercase tracking-wider font-semibold text-subtle hover:text-heading"
          >
            {expanded ? "Show latest only" : `Show all ${calls.length}`}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((c) => (
          <PriorCallCard key={c.id} call={c} />
        ))}
      </div>
    </div>
  );
}

function PriorCallCard({ call }: { call: PriorCall }) {
  const closerLabel = call.closerName ?? call.openerName ?? "Unknown rep";
  const duration = formatDuration(call.durationSeconds);
  const value =
    call.contractValueCents != null && call.contractValueCents > 0
      ? `$${Math.round(call.contractValueCents / 100).toLocaleString()}`
      : null;

  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-[8px] p-3">
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        {call.outcome && (
          <span
            className={[
              "text-2xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded border",
              OUTCOME_STYLES[call.outcome],
            ].join(" ")}
          >
            {OUTCOME_LABELS[call.outcome]}
          </span>
        )}
        <span className="text-xs text-body font-medium">{closerLabel}</span>
        <span className="text-2xs text-subtle">· {timeAgo(call.startedAt)}</span>
        {duration && <span className="text-2xs text-subtle">· {duration}</span>}
        {value && <span className="text-2xs text-[var(--color-success)] font-semibold">· {value}</span>}
        {call.packageSold && (
          <span className="text-2xs text-subtle">· {call.packageSold}</span>
        )}
      </div>

      {call.objectionsHit && call.objectionsHit.length > 0 && (
        <div className="mt-2">
          <p className="text-2xs uppercase tracking-wider text-subtle font-semibold mb-1">
            Objections raised
          </p>
          <div className="flex flex-wrap gap-1.5">
            {call.objectionsHit.map((o) => (
              <span
                key={o}
                className="text-2xs px-2 py-0.5 rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20"
              >
                {o}
              </span>
            ))}
          </div>
        </div>
      )}

      {call.triggersHit && call.triggersHit.length > 0 && (
        <div className="mt-2">
          <p className="text-2xs uppercase tracking-wider text-subtle font-semibold mb-1">
            Triggers that worked
          </p>
          <div className="flex flex-wrap gap-1.5">
            {call.triggersHit.map((t) => (
              <span
                key={t}
                className="text-2xs px-2 py-0.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {call.notes && (
        <div className="mt-2">
          <p className="text-2xs uppercase tracking-wider text-subtle font-semibold mb-1">Notes</p>
          <p className="text-xs text-body leading-relaxed whitespace-pre-wrap">{call.notes}</p>
        </div>
      )}
    </div>
  );
}
