import { useRef, useState } from "react";
import { Button, CTAButton } from "./ui/Button";
import { Logo } from "./ui/Logo";
import { streamProbe } from "../lib/streamProbe";
import { saveReport } from "../lib/storage";
import type { FirmInput, ProbeReport } from "../types";
import type { ProbeSource } from "../lib/streamProbe";

interface NewAssessmentDialogProps {
  open: boolean;
  onClose: () => void;
  onLoaded: (report: ProbeReport) => void;
}

type Phase = "form" | "running" | "done" | "error";

interface SourceState {
  status: "idle" | "running" | "ok" | "partial" | "failed" | "skipped";
  durationMs?: number;
  error?: string;
}

const SOURCE_LABELS: Record<ProbeSource, string> = {
  "site-scrape": "Website scan",
  "google-places": "Google Business Profile",
  "serp-local": "Local search results",
};

const SOURCE_ICONS: Record<ProbeSource, string> = {
  "site-scrape": "🌐",
  "google-places": "📍",
  "serp-local": "🔍",
};

const SOURCES: ProbeSource[] = ["site-scrape", "google-places", "serp-local"];

const PRACTICE_AREAS = [
  "Criminal Defense",
  "Personal Injury",
  "Family Law",
  "Immigration",
  "Estate Planning",
  "Bankruptcy",
  "Employment Law",
  "Business Law",
  "Real Estate",
  "Civil Litigation",
];

const US_STATES: Array<[string, string]> = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

const BLANK_FIRM: FirmInput = { name: "", url: "", city: "", state: "", practiceArea: "" };

const BLANK_SOURCES: Record<ProbeSource, SourceState> = {
  "site-scrape": { status: "idle" },
  "google-places": { status: "idle" },
  "serp-local": { status: "idle" },
};

const inputClass =
  "w-full bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-sm text-body outline-none focus:ring-2 focus:ring-brand";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
        {label}
        {required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function NewAssessmentDialog({ open, onClose, onLoaded }: NewAssessmentDialogProps) {
  const [phase, setPhase] = useState<Phase>("form");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [firm, setFirm] = useState<FirmInput>(BLANK_FIRM);
  const [sources, setSources] = useState<Record<ProbeSource, SourceState>>(BLANK_SOURCES);
  const abortRef = useRef<(() => void) | null>(null);

  if (!open) return null;

  const reset = () => {
    setPhase("form");
    setErrorMsg(null);
    setSources(BLANK_SOURCES);
    setFirm(BLANK_FIRM);
  };

  const handleClose = () => {
    abortRef.current?.();
    onClose();
    setTimeout(reset, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhase("running");
    setErrorMsg(null);
    setSources(BLANK_SOURCES);

    const { events, abort } = streamProbe(firm);
    abortRef.current = abort;

    try {
      for await (const event of events) {
        if (event.type === "step") {
          setSources((prev) => ({
            ...prev,
            [event.source]: {
              status: event.status,
              durationMs: event.durationMs,
              error: event.error,
            },
          }));
        } else if (event.type === "report") {
          await saveReport(event.report);
          setPhase("done");
          setTimeout(() => {
            onLoaded(event.report);
          }, 900);
        } else if (event.type === "error") {
          setErrorMsg(event.message);
          setPhase("error");
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  };

  const isValid =
    firm.name.trim() &&
    firm.url.trim() &&
    firm.city.trim() &&
    firm.state.trim() &&
    firm.practiceArea.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/30 p-4"
      onClick={phase === "running" ? undefined : handleClose}
    >
      <div
        className="bg-surface rounded-[8px] shadow-xl border border-[var(--color-border)] w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div>
              <h2 className="text-lg font-semibold text-heading">New Assessment</h2>
              {phase === "running" && (
                <p className="text-xs text-subtle">Scanning sources…</p>
              )}
            </div>
          </div>
          {phase !== "running" && (
            <button
              onClick={handleClose}
              aria-label="close"
              className="w-8 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md active:nm-inset transition-all duration-200 flex items-center justify-center text-subtle"
            >
              ×
            </button>
          )}
        </div>

        <div className="p-6">
          {/* FORM */}
          {phase === "form" && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Firm Name" required>
                <input
                  type="text"
                  value={firm.name}
                  onChange={(e) => setFirm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Smith & Associates"
                  required
                  className={inputClass}
                />
              </Field>

              <Field label="Website URL" required>
                <input
                  type="url"
                  value={firm.url}
                  onChange={(e) => setFirm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://smithlaw.com"
                  required
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="City" required>
                  <input
                    type="text"
                    value={firm.city}
                    onChange={(e) => setFirm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Great Falls"
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="State" required>
                  <select
                    value={firm.state}
                    onChange={(e) => setFirm((f) => ({ ...f, state: e.target.value }))}
                    required
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    {US_STATES.map(([abbr, name]) => (
                      <option key={abbr} value={abbr}>
                        {abbr} — {name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Practice Area" required>
                <select
                  value={firm.practiceArea}
                  onChange={(e) => setFirm((f) => ({ ...f, practiceArea: e.target.value }))}
                  required
                  className={inputClass}
                >
                  <option value="">Select practice area…</option>
                  {PRACTICE_AREAS.map((pa) => (
                    <option key={pa} value={pa}>
                      {pa}
                    </option>
                  ))}
                </select>
              </Field>

              <CTAButton type="submit" fullWidth disabled={!isValid} className="mt-2">
                Run Assessment
              </CTAButton>
            </form>
          )}

          {/* RUNNING / DONE */}
          {(phase === "running" || phase === "done") && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-subtle mb-1">
                <span className="font-semibold text-heading">{firm.name}</span>
                {" · "}
                {firm.city}, {firm.state} · {firm.practiceArea}
              </p>

              {SOURCES.map((src) => {
                const s = sources[src];
                return (
                  <div
                    key={src}
                    className="flex items-center gap-3 p-3 rounded-[8px] bg-surface shadow-sm border border-[var(--color-border)]"
                  >
                    <span className="text-lg w-6 text-center" aria-hidden="true">
                      {SOURCE_ICONS[src]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading">{SOURCE_LABELS[src]}</p>
                      {s.status === "running" && (
                        <p className="text-xs text-subtle">Scanning…</p>
                      )}
                      {(s.status === "ok" || s.status === "partial") && s.durationMs != null && (
                        <p className="text-xs text-subtle">{(s.durationMs / 1000).toFixed(1)}s</p>
                      )}
                      {(s.status === "failed" || s.status === "skipped") && (
                        <p className="text-xs text-[var(--color-danger)] truncate">
                          {s.error ?? "failed"}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 w-6 text-center">
                      {s.status === "idle" && <span className="text-subtle text-sm">—</span>}
                      {s.status === "running" && (
                        <span className="inline-block animate-spin text-brand text-base">⟳</span>
                      )}
                      {(s.status === "ok" || s.status === "partial") && (
                        <span className="text-green-500 text-base">✓</span>
                      )}
                      {(s.status === "failed" || s.status === "skipped") && (
                        <span className="text-[var(--color-danger)] text-base">✗</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {phase === "done" && (
                <div className="mt-1 p-3 rounded-[8px] bg-green-50 border border-green-200 flex items-center gap-2">
                  <span className="text-green-600 text-lg">✓</span>
                  <p className="text-sm text-green-700 font-medium">
                    Assessment complete — loading dashboard…
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ERROR */}
          {phase === "error" && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#FEF2F2] border border-[var(--color-danger)]/30 rounded-[8px] p-4">
                <p className="text-sm font-semibold text-[var(--color-danger)] mb-1">
                  Assessment failed
                </p>
                <p className="text-xs text-[var(--color-danger)]">{errorMsg}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="neutral" fullWidth onClick={() => setPhase("form")}>
                  Edit fields
                </Button>
                <CTAButton
                  fullWidth
                  onClick={() => {
                    void handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                  }}
                >
                  Retry
                </CTAButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
