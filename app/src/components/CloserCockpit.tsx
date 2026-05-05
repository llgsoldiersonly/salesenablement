import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/Button";
import {
  buildTalkingPoints,
  CLOSING_TRIGGERS,
  OBJECTIONS,
  type Objection,
  type TalkingPoint,
} from "../lib/closerCockpit";
import type { PackageRecommendation, ProbeReport } from "../types";

interface CloserCockpitProps {
  report: ProbeReport;
  recommendation: PackageRecommendation;
  callStartedAt: number;
  onEndCall: () => void;
}

const NOTES_KEY_PREFIX = "llg.callNotes.";
const TRIGGERS_KEY_PREFIX = "llg.callTriggers.";

const CATEGORY_ICON: Record<TalkingPoint["category"], string> = {
  intake: "🚨",
  competitor: "⚔️",
  trust: "🛡️",
  package: "🎯",
};

export function CloserCockpit({
  report,
  recommendation,
  callStartedAt,
  onEndCall,
}: CloserCockpitProps) {
  const firmKey = report.firm.url || report.firm.name;
  const notesKey = NOTES_KEY_PREFIX + firmKey;
  const triggersKey = TRIGGERS_KEY_PREFIX + firmKey;

  const talkingPoints = useMemo(
    () => buildTalkingPoints(report, recommendation),
    [report, recommendation],
  );

  const [elapsed, setElapsed] = useState(0);
  const [openObjection, setOpenObjection] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>(() => localStorage.getItem(notesKey) ?? "");
  const [hitTriggers, setHitTriggers] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(triggersKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Tick the timer every second
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - callStartedAt) / 1000));
    }, 1000);
    setElapsed(Math.floor((Date.now() - callStartedAt) / 1000));
    return () => clearInterval(id);
  }, [callStartedAt]);

  // Persist notes
  useEffect(() => {
    if (notes) localStorage.setItem(notesKey, notes);
    else localStorage.removeItem(notesKey);
  }, [notes, notesKey]);

  // Persist triggers
  useEffect(() => {
    if (hitTriggers.size > 0) {
      localStorage.setItem(triggersKey, JSON.stringify([...hitTriggers]));
    } else {
      localStorage.removeItem(triggersKey);
    }
  }, [hitTriggers, triggersKey]);

  const toggleTrigger = (id: string) => {
    setHitTriggers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const triggerCount = hitTriggers.size;
  const closeReady = triggerCount >= 2;

  return (
    <div className="flex flex-col h-full">
      {/* Header — sticky timer + end call */}
      <div className="shrink-0 bg-[#0F172A] text-[#ECF0F3] px-4 py-3 rounded-t-[8px] -mx-4 -mt-5 mb-4 flex items-center justify-between">
        <div>
          <p className="text-2xs uppercase tracking-widest text-[#94A3B8] font-semibold">
            Closer Call · Live
          </p>
          <p className="text-xl font-mono font-semibold tabular-nums">
            {formatElapsed(elapsed)}
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={onEndCall}
          className="!bg-[#1E293B] !border-[#334155] !text-[#FCA5A5]"
        >
          End Call
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-5 pr-1 -mr-1">
        {/* Talking points */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-heading mb-2">
            Talking Points
          </h3>
          <div className="flex flex-col gap-2">
            {talkingPoints.length === 0 && (
              <p className="text-xs text-subtle italic">
                No critical concerns detected — lead with the recommended package.
              </p>
            )}
            {talkingPoints.map((tp) => (
              <div
                key={tp.id}
                className="rounded-[8px] bg-surface shadow-sm border border-[var(--color-border)] border-l-[3px] border-l-brand p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="text-base shrink-0" aria-hidden="true">
                    {CATEGORY_ICON[tp.category]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-heading leading-snug">
                      {tp.headline}
                    </p>
                    <p className="text-xs text-body leading-relaxed mt-1">{tp.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Objection handler */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-heading mb-2">
            Objection Handler
            <span className="ml-2 text-2xs text-subtle font-normal normal-case tracking-normal">
              tap to reveal counter
            </span>
          </h3>
          <div className="flex flex-col gap-1.5">
            {OBJECTIONS.map((obj) => (
              <ObjectionCard
                key={obj.id}
                objection={obj}
                open={openObjection === obj.id}
                onToggle={() =>
                  setOpenObjection((prev) => (prev === obj.id ? null : obj.id))
                }
              />
            ))}
          </div>
        </section>

        {/* Closing triggers */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-heading">
              Closing Triggers
            </h3>
            <span
              className={[
                "text-2xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded",
                closeReady
                  ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                  : "bg-surface text-subtle border border-[var(--color-border)]",
              ].join(" ")}
            >
              {triggerCount}/{CLOSING_TRIGGERS.length}
              {closeReady ? " · Ask for it" : ""}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {CLOSING_TRIGGERS.map((t) => {
              const hit = hitTriggers.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTrigger(t.id)}
                  className={[
                    "flex items-start gap-2 text-left p-2 rounded-[8px] border transition-all duration-150",
                    hit
                      ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/30"
                      : "bg-surface border-[var(--color-border)] hover:shadow-sm",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "shrink-0 w-4 h-4 rounded mt-0.5 flex items-center justify-center text-2xs",
                      hit
                        ? "bg-[var(--color-success)] text-white"
                        : "border border-[var(--color-border-strong)]",
                    ].join(" ")}
                  >
                    {hit && "✓"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        "text-xs font-medium leading-snug",
                        hit ? "text-heading" : "text-body",
                      ].join(" ")}
                    >
                      {t.label}
                    </p>
                    {hit && (
                      <p className="text-2xs text-subtle leading-relaxed mt-0.5">{t.hint}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {closeReady && (
            <div className="mt-2 p-2 rounded-[8px] bg-[var(--color-success)]/10 border border-[var(--color-success)]/30">
              <p className="text-xs text-heading font-semibold">
                Strong closing signals — ask for the order.
              </p>
              <p className="text-2xs text-body leading-relaxed mt-0.5">
                "Sounds like we're aligned. Want me to send the agreement so we can start onboarding this week?"
              </p>
            </div>
          )}
        </section>

        {/* Live notes */}
        <section className="pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-heading mb-2">
            Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type while you talk — autosaved per firm."
            className="w-full h-32 bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-xs text-body resize-none outline-none focus:ring-2 focus:ring-brand"
          />
          <p className="text-2xs text-subtle mt-1">
            Saved locally · {notes.length} chars
          </p>
        </section>
      </div>
    </div>
  );
}

function ObjectionCard({
  objection,
  open,
  onToggle,
}: {
  objection: Objection;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={[
        "rounded-[8px] border transition-all duration-150",
        open
          ? "bg-surface shadow-md border-[var(--color-border-strong)]"
          : "bg-surface shadow-sm border-[var(--color-border)] hover:shadow-md",
      ].join(" ")}
    >
      <button onClick={onToggle} className="w-full text-left px-3 py-2 flex items-start gap-2">
        <span className="text-xs text-subtle shrink-0 mt-0.5">{open ? "−" : "+"}</span>
        <p className="text-xs text-body italic flex-1 leading-snug">"{objection.text}"</p>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 ml-4 border-l-2 border-brand/30">
          <p className="text-2xs uppercase tracking-wider text-brand font-semibold mb-1">
            Counter
          </p>
          <p className="text-xs text-heading leading-relaxed">{objection.counter}</p>
          {objection.followUp && (
            <>
              <p className="text-2xs uppercase tracking-wider text-subtle font-semibold mt-2 mb-1">
                Follow-up
              </p>
              <p className="text-2xs text-body leading-relaxed">{objection.followUp}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatElapsed(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
