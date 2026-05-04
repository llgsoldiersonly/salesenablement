import { useRef, useState } from "react";
import { Button, CTAButton } from "./ui/Button";
import { Card } from "./ui/Card";
import { isProbeReport, listReports, saveReport, setActiveReport, deleteReport } from "../lib/storage";
import type { ProbeReport } from "../types";

interface LoadReportDialogProps {
  open: boolean;
  onClose: () => void;
  onLoaded: (report: ProbeReport) => void;
  onUseMock: () => void;
}

export function LoadReportDialog({ open, onClose, onLoaded, onUseMock }: LoadReportDialogProps) {
  const [pasteValue, setPasteValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stored = listReports();

  if (!open) return null;

  const handleLoad = (raw: string) => {
    setError(null);
    try {
      const parsed = JSON.parse(raw);
      if (!isProbeReport(parsed)) {
        setError("That doesn't look like a probe report. Expected fields: firm, sources, coverageScore.");
        return;
      }
      saveReport(parsed);
      onLoaded(parsed);
    } catch (err) {
      setError(err instanceof Error ? `Invalid JSON: ${err.message}` : "Invalid JSON");
    }
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    handleLoad(text);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/30 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[8px] shadow-xl border border-[var(--color-border)] w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">Load Probe Report</h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="w-8 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md active:nm-inset transition-all duration-200 flex items-center justify-center text-subtle"
          >
            ×
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* Recent reports */}
          {stored.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">
                Recent reports
              </p>
              <div className="flex flex-col gap-1.5">
                {stored.slice(0, 6).map((s) => (
                  <Card
                    key={s.id}
                    interactive
                    className="flex items-center justify-between p-3"
                  >
                    <button
                      onClick={() => {
                        setActiveReport(s.id);
                        onLoaded(s.report);
                      }}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium text-heading">{s.report.firm.name}</p>
                      <p className="text-xs text-subtle">
                        {s.report.firm.city}, {s.report.firm.state} · {s.report.firm.practiceArea} ·{" "}
                        {new Date(s.loadedAt).toLocaleDateString()}
                      </p>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReport(s.id);
                        // force re-render
                        setError("");
                        setTimeout(() => setError(null), 0);
                      }}
                      aria-label="delete"
                      className="text-subtle hover:text-[var(--color-danger)] text-sm px-2"
                    >
                      ×
                    </button>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Upload */}
          <section>
            <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">
              Upload .json file
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Button
              variant="neutral"
              fullWidth
              onClick={() => fileRef.current?.click()}
            >
              📁 Choose JSON file
            </Button>
            <p className="text-2xs text-subtle mt-1.5 leading-relaxed">
              Run <code className="text-brand">npm run probe</code> in <code>spike/probe/</code>{" "}
              to generate a report file.
            </p>
          </section>

          {/* Paste */}
          <section>
            <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">
              Or paste JSON
            </p>
            <textarea
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder='{"firm": {"name": "..."}, ...}'
              className="w-full h-32 bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-xs text-body resize-none outline-none focus:ring-2 focus:ring-brand font-mono"
            />
            <Button
              variant="brand"
              fullWidth
              className="mt-2"
              disabled={!pasteValue.trim()}
              onClick={() => handleLoad(pasteValue)}
            >
              Load pasted report
            </Button>
          </section>

          {error && (
            <div className="bg-[#FEF2F2] border border-[var(--color-danger)]/30 rounded-[8px] p-3">
              <p className="text-xs text-[var(--color-danger)]">{error}</p>
            </div>
          )}

          {/* Mock fallback */}
          <section className="border-t border-[var(--color-border)] pt-4">
            <CTAButton fullWidth onClick={onUseMock}>
              Demo: Olson Law Office
            </CTAButton>
            <p className="text-2xs text-subtle text-center mt-1.5">
              Use the built-in mock report (Great Falls, MT — criminal defense).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
