import { useEffect, useState } from "react";
import {
  getAssessmentTimeline,
  type CallOutcome,
  type TimelineEvent,
} from "../../lib/assessmentTimeline";

const ACTIVE_KEY = "llg.activeAssessment.v2";

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

const ICONS: Record<TimelineEvent["type"], string> = {
  assessment_created: "🆕",
  brief_generated: "📄",
  call_ended: "📞",
  note_added: "📝",
};

const HEADLINES: Record<TimelineEvent["type"], string> = {
  assessment_created: "Lead created",
  brief_generated: "Brief generated",
  call_ended: "Call logged",
  note_added: "Note added",
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return `Today, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  const diff = (now.getTime() - date.getTime()) / 86400000;
  if (diff < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" }) +
      `, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds < 1) return null;
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

export function ActivityTab() {
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAssessmentId(localStorage.getItem(ACTIVE_KEY));
  }, []);

  useEffect(() => {
    if (!assessmentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getAssessmentTimeline(assessmentId).then((e) => {
      if (cancelled) return;
      setEvents(e);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  if (!assessmentId) {
    return (
      <div className="flex flex-col gap-5 p-6 overflow-y-auto scrollbar-thin flex-1">
        <h2 className="text-2xl font-semibold text-heading">Activity</h2>
        <p className="text-sm text-subtle">No active assessment loaded.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6 overflow-y-auto scrollbar-thin flex-1">
      <div>
        <h2 className="text-2xl font-semibold text-heading">Activity</h2>
        <p className="text-sm text-subtle mt-0.5">
          Everything that's happened on this lead, newest first.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-subtle animate-pulse text-center py-8">Loading timeline…</p>
      ) : events.length === 0 ? (
        <div className="border border-dashed border-[var(--color-border-strong)] rounded-[8px] p-8 text-center bg-surface">
          <p className="text-sm text-heading font-medium">No activity yet.</p>
        </div>
      ) : (
        <ol className="relative border-l-2 border-[var(--color-border)] ml-3 flex flex-col gap-5">
          {events.map((e) => (
            <TimelineItem key={e.id} event={e} />
          ))}
        </ol>
      )}
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  return (
    <li className="ml-6 relative">
      <span
        aria-hidden="true"
        className="absolute -left-[2.1rem] top-0 w-7 h-7 rounded-full bg-surface border-2 border-[var(--color-border)] flex items-center justify-center text-sm shadow-sm"
      >
        {ICONS[event.type]}
      </span>
      <div className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-heading">{HEADLINES[event.type]}</h3>
          {event.type === "call_ended" && event.callOutcome && (
            <span
              className={[
                "text-2xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded border",
                OUTCOME_STYLES[event.callOutcome],
              ].join(" ")}
            >
              {OUTCOME_LABELS[event.callOutcome]}
            </span>
          )}
        </div>
        <p className="text-2xs text-subtle mt-0.5">
          <span className="font-medium text-body">{event.actorName ?? "Unknown"}</span>
          {" · "}
          {formatTime(event.at)}
        </p>

        {event.type === "call_ended" && (
          <CallDetails event={event} />
        )}

        {event.type === "brief_generated" && event.briefTokens && (
          <p className="text-2xs text-subtle mt-2">
            {event.briefTokens.input + event.briefTokens.output} tokens
            {event.briefTokens.cacheRead > 0 &&
              ` · ${event.briefTokens.cacheRead} cache read`}
          </p>
        )}

        {event.type === "note_added" && event.noteBody && (
          <p className="text-sm text-body leading-relaxed whitespace-pre-wrap mt-2">
            {event.noteBody}
          </p>
        )}
      </div>
    </li>
  );
}

function CallDetails({ event }: { event: TimelineEvent }) {
  const duration = formatDuration(event.callDurationSeconds);
  const value =
    event.callContractValueCents != null && event.callContractValueCents > 0
      ? `$${Math.round(event.callContractValueCents / 100).toLocaleString()}`
      : null;

  const meta = [duration, event.callPackageSold, value].filter(Boolean).join(" · ");

  return (
    <>
      {meta && <p className="text-2xs text-body mt-1">{meta}</p>}
      {event.callNotes && (
        <p className="text-sm text-body leading-relaxed whitespace-pre-wrap mt-2">
          {event.callNotes}
        </p>
      )}
    </>
  );
}
