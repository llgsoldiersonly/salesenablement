import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/Button";
import {
  buildTalkingPoints,
  CLOSING_TRIGGERS,
  OBJECTIONS,
  type Objection,
  type TalkingPoint,
} from "../lib/closerCockpit";
import { detectSignals } from "../lib/detectCockpitSignals";
import { useDeepgramTranscription } from "../lib/useDeepgramTranscription";
import { AskAIPanel } from "./closer/AskAIPanel";
import type { PackageRecommendation, ProbeReport } from "../types";
import type { AskContext } from "../../server/ask-handler";

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

function buildAskContext(report: ProbeReport, recommendation: PackageRecommendation): AskContext {
  return {
    firmName: report.firm.name,
    firmCity: report.firm.city,
    firmState: report.firm.state,
    practiceArea: report.firm.practiceArea,
    coverageScore: report.coverageScore,
    concerns: report.concerns ?? [],
    recommendedPackage: recommendation.primary,
    competitors: [
      ...(report.sources.serpLocal.data?.topLocalPackCompetitors.slice(0, 3).map((c) => c.name) ?? []),
      ...(report.sources.serpLocal.data?.topOrganicCompetitors.slice(0, 2).map((c) => c.name) ?? []),
    ],
  };
}

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
  const [flashObjection, setFlashObjection] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>(() => localStorage.getItem(notesKey) ?? "");
  const [hitTriggers, setHitTriggers] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(triggersKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utterancesEndRef = useRef<HTMLDivElement | null>(null);

  // Utterance handler — detect signals and auto-update UI
  const handleUtterance = useCallback(
    (text: string) => {
      const { objectionId, triggerIds } = detectSignals(text);

      if (objectionId) {
        setOpenObjection(objectionId);
        setFlashObjection(objectionId);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setFlashObjection(null), 2000);
      }

      if (triggerIds.length > 0) {
        setHitTriggers((prev) => {
          const next = new Set(prev);
          triggerIds.forEach((id) => next.add(id));
          return next;
        });
      }
    },
    [],
  );

  const { state: txState, errorMsg: txError, liveText, utterances, start: startTx, stop: stopTx } =
    useDeepgramTranscription({ onUtterance: handleUtterance });

  const transcriptionActive = txState === "active";
  const transcriptionBusy = txState === "requesting-display" || txState === "connecting";

  // Scroll utterances list to bottom on new entry
  useEffect(() => {
    utterancesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [utterances.length, liveText]);

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

  // Stop transcription when call ends
  const handleEndCall = () => {
    stopTx();
    onEndCall();
  };

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
      {/* Header — timer + transcription toggle + end call */}
      <div className="shrink-0 bg-[#0F172A] text-[#ECF0F3] px-4 py-3 rounded-t-[8px] -mx-4 -mt-5 mb-4 flex items-center justify-between">
        <div>
          <p className="text-2xs uppercase tracking-widest text-[#94A3B8] font-semibold">
            Closer Call · Live
          </p>
          <p className="text-xl font-mono font-semibold tabular-nums">
            {formatElapsed(elapsed)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Live transcription toggle */}
          <button
            onClick={transcriptionActive ? stopTx : startTx}
            disabled={transcriptionBusy}
            title={transcriptionActive ? "Stop transcription" : "Start live transcription"}
            className={[
              "w-7 h-7 rounded-[6px] flex items-center justify-center text-sm transition-all duration-150",
              transcriptionActive
                ? "bg-brand text-white shadow-sm"
                : transcriptionBusy
                  ? "bg-[#1E293B] text-[#64748B] cursor-wait"
                  : "bg-[#1E293B] text-[#94A3B8] hover:text-[#ECF0F3] hover:bg-[#334155]",
            ].join(" ")}
          >
            {transcriptionBusy ? "…" : "🎙"}
          </button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleEndCall}
            className="!bg-[#1E293B] !border-[#334155] !text-[#FCA5A5]"
          >
            End Call
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-5 pr-1 -mr-1">

        {/* Live transcript feed */}
        {(transcriptionActive || utterances.length > 0 || txError) && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-heading">
                Live Transcript
              </h3>
              {transcriptionActive && (
                <span className="inline-flex items-center gap-1 text-2xs text-brand font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                  Live
                </span>
              )}
            </div>

            {txError && (
              <div className="rounded-[8px] bg-[#FEF2F2] border border-[var(--color-danger)]/30 p-2 mb-2">
                <p className="text-2xs text-[var(--color-danger)]">{txError}</p>
              </div>
            )}

            <div className="rounded-[8px] bg-surface shadow-inset border border-[var(--color-border)] p-3 max-h-36 overflow-y-auto scrollbar-thin flex flex-col gap-1">
              {utterances.length === 0 && !liveText && (
                <p className="text-xs text-subtle italic">
                  {transcriptionActive
                    ? "Listening for speech…"
                    : "No transcript yet."}
                </p>
              )}
              {utterances.map((u) => (
                <p key={u.ts} className="text-xs text-body leading-relaxed">
                  {u.text}
                </p>
              ))}
              {liveText && (
                <p className="text-xs text-subtle italic leading-relaxed">{liveText}…</p>
              )}
              <div ref={utterancesEndRef} />
            </div>
            <p className="text-2xs text-subtle mt-1">
              Detects objections + closing triggers automatically
            </p>
          </section>
        )}

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
              {transcriptionActive ? "auto-detecting" : "tap to reveal counter"}
            </span>
          </h3>
          <div className="flex flex-col gap-1.5">
            {OBJECTIONS.map((obj) => (
              <ObjectionCard
                key={obj.id}
                objection={obj}
                open={openObjection === obj.id}
                flash={flashObjection === obj.id}
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
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-heading mb-2">
            Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type while you talk — autosaved per firm."
            className="w-full h-28 bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-xs text-body resize-none outline-none focus:ring-2 focus:ring-brand"
          />
          <p className="text-2xs text-subtle mt-1">Saved locally · {notes.length} chars</p>
        </section>

        {/* Ask AI */}
        <section className="pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-heading mb-2">
            Ask AI
          </h3>
          <AskAIPanel context={buildAskContext(report, recommendation)} compact />
        </section>
      </div>
    </div>
  );
}

function ObjectionCard({
  objection,
  open,
  flash,
  onToggle,
}: {
  objection: Objection;
  open: boolean;
  flash: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={[
        "rounded-[8px] border transition-all duration-200",
        flash
          ? "bg-brand/10 border-brand shadow-md"
          : open
            ? "bg-surface shadow-md border-[var(--color-border-strong)]"
            : "bg-surface shadow-sm border-[var(--color-border)] hover:shadow-md",
      ].join(" ")}
    >
      <button onClick={onToggle} className="w-full text-left px-3 py-2 flex items-start gap-2">
        <span className="text-xs text-subtle shrink-0 mt-0.5">{open ? "−" : "+"}</span>
        <p className="text-xs text-body italic flex-1 leading-snug">"{objection.text}"</p>
        {flash && (
          <span className="shrink-0 text-2xs font-semibold text-brand uppercase tracking-wider">
            Detected
          </span>
        )}
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
