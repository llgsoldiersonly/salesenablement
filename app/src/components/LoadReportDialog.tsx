import { useEffect, useRef, useState } from "react";
import { Button, CTAButton } from "./ui/Button";
import { Card } from "./ui/Card";
import { Modal, ModalHeader, ModalBody } from "./ui/Modal";
import { inputClass } from "./ui/Input";
import {
  isProbeReport,
  listReports,
  saveReport,
  setActiveReport,
  deleteReport,
  type StoredReport,
} from "../lib/storage";
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
  const [stored, setStored] = useState<StoredReport[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listReports().then((reports) => {
      if (!cancelled) setStored(reports);
    });
    return () => {
      cancelled = true;
    };
  }, [open, reloadKey]);

  const handleLoad = async (raw: string) => {
    setError(null);
    try {
      const parsed = JSON.parse(raw);
      if (!isProbeReport(parsed)) {
        setError("That doesn't look like a probe report. Expected fields: firm, sources, coverageScore.");
        return;
      }
      await saveReport(parsed);
      onLoaded(parsed);
    } catch (err) {
      setError(err instanceof Error ? `Invalid JSON: ${err.message}` : "Invalid JSON");
    }
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    await handleLoad(text);
  };

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel="Load Probe Report">
      <ModalHeader onClose={onClose}>Load Probe Report</ModalHeader>

      <ModalBody className="flex flex-col gap-5">
        {/* Recent reports */}
        {stored.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-body-subtle uppercase tracking-wider mb-2">
              Recent reports
            </p>
            <div className="flex flex-col gap-1.5">
              {stored.slice(0, 6).map((s) => (
                <Card key={s.id} interactive className="flex items-center justify-between p-3">
                  <button
                    onClick={() => {
                      setActiveReport(s.id);
                      onLoaded(s.report);
                    }}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-heading">{s.report.firm.name}</p>
                    <p className="text-xs text-body-subtle">
                      {s.report.firm.city}, {s.report.firm.state} · {s.report.firm.practiceArea} ·{" "}
                      {new Date(s.loadedAt).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await deleteReport(s.id);
                      setReloadKey((k) => k + 1);
                    }}
                    aria-label="delete"
                    className="text-body-subtle hover:text-fg-danger text-sm px-2"
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
          <p className="text-xs font-semibold text-body-subtle uppercase tracking-wider mb-2">
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
          <Button variant="neutral" fullWidth onClick={() => fileRef.current?.click()}>
            📁 Choose JSON file
          </Button>
          <p className="text-2xs text-body-subtle mt-1.5 leading-relaxed">
            Run <code className="text-fg-brand font-mono">npm run probe</code> in{" "}
            <code className="font-mono">spike/probe/</code> to generate a report file.
          </p>
        </section>

        {/* Paste */}
        <section>
          <p className="text-xs font-semibold text-body-subtle uppercase tracking-wider mb-2">
            Or paste JSON
          </p>
          <textarea
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            placeholder='{"firm": {"name": "..."}, ...}'
            className={`${inputClass} h-32 text-xs resize-none font-mono`}
          />
          <Button
            variant="neutral"
            fullWidth
            className="mt-2"
            disabled={!pasteValue.trim()}
            onClick={() => void handleLoad(pasteValue)}
          >
            Load pasted report
          </Button>
        </section>

        {error && (
          <div className="bg-danger-soft border border-[var(--color-border-danger-subtle)] rounded-[8px] p-3">
            <p className="text-xs text-fg-danger-strong">{error}</p>
          </div>
        )}

        {/* Mock fallback */}
        <section className="border-t border-[var(--color-border-default)] pt-4">
          <CTAButton fullWidth onClick={onUseMock}>
            Demo: Olson Law Office
          </CTAButton>
          <p className="text-2xs text-body-subtle text-center mt-1.5">
            Use the built-in mock report (Great Falls, MT — criminal defense).
          </p>
        </section>
      </ModalBody>
    </Modal>
  );
}
