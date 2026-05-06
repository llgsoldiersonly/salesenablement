import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Card } from "./ui/Card";
import { Button, CTAButton } from "./ui/Button";
import { BriefFeedback } from "./BriefFeedback";
import { streamBrief } from "../lib/streamBrief";
import {
  firmKey,
  getBrief,
  saveBrief,
  deleteBrief,
  saveBriefToSupabase,
  loadLatestBriefFromSupabase,
} from "../lib/briefStorage";
import type { PackageRecommendation, ProbeReport } from "../types";

const ACTIVE_KEY = "llg.activeAssessment.v2";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface GeneratedBriefProps {
  report: ProbeReport;
  recommendation: PackageRecommendation;
}

type Status = "idle" | "streaming" | "done" | "error";

interface UsageInfo { input: number; output: number; cache_read: number; cache_write: number }

export function GeneratedBrief({ report, recommendation }: GeneratedBriefProps) {
  const key = useMemo(() => firmKey(report.firm.name, report.firm.url), [report.firm]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [briefMeta, setBriefMeta] = useState<{ generatedAt: string; byName: string | null } | null>(null);
  const [briefId, setBriefId] = useState<string | null>(null);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore brief: check localStorage first, then fall back to Supabase.
  useEffect(() => {
    const stored = getBrief(key);
    if (stored) {
      setText(stored.text);
      setUsage(stored.usage ?? null);
      setBriefMeta({ generatedAt: stored.generatedAt, byName: null });
      setStatus("done");
      setError(null);
    } else {
      setText("");
      setUsage(null);
      setBriefMeta(null);
      setBriefId(null);
      setStatus("idle");
      setError(null);
      // Try Supabase fallback for cross-device / team-shared briefs
      const assessmentId = localStorage.getItem(ACTIVE_KEY);
      setActiveAssessmentId(assessmentId);
      if (assessmentId) {
        void loadLatestBriefFromSupabase(assessmentId).then((remote) => {
          if (remote) {
            setText(remote.bodyMd);
            setUsage(remote.usage ?? null);
            setBriefMeta({ generatedAt: remote.createdAt, byName: remote.generatedByName });
            setBriefId(remote.id);
            setStatus("done");
            // Hydrate localStorage so subsequent loads are instant
            saveBrief({
              firmKey: key,
              text: remote.bodyMd,
              generatedAt: remote.createdAt,
              usage: remote.usage,
            });
          }
        });
      }
    }
    return () => abortRef.current?.();
  }, [key]);

  // Auto-scroll the brief container as content streams in.
  useEffect(() => {
    if (status === "streaming" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, status]);

  const handleGenerate = async () => {
    setText("");
    setError(null);
    setUsage(null);
    setStatus("streaming");

    const handle = streamBrief(report, recommendation);
    abortRef.current = handle.abort;

    let buffer = "";
    let gotUsage: UsageInfo | null = null;

    for await (const ev of handle.events) {
      if (ev.type === "text") {
        buffer += ev.data;
        setText(buffer);
      } else if (ev.type === "usage") {
        gotUsage = {
          input: ev.input,
          output: ev.output,
          cache_read: ev.cache_read,
          cache_write: ev.cache_write,
        };
        setUsage(gotUsage);
      } else if (ev.type === "error") {
        setError(ev.message);
        setStatus("error");
        return;
      } else if (ev.type === "done") {
        break;
      }
    }

    const generatedAt = new Date().toISOString();
    setStatus("done");
    setBriefMeta({ generatedAt, byName: null });
    saveBrief({
      firmKey: key,
      text: buffer,
      generatedAt,
      usage: gotUsage ?? undefined,
    });
    const assessmentId = localStorage.getItem(ACTIVE_KEY);
    setActiveAssessmentId(assessmentId);
    if (assessmentId && buffer) {
      const newId = await saveBriefToSupabase(assessmentId, buffer, gotUsage ?? undefined);
      if (newId) setBriefId(newId);
    }
    abortRef.current = null;
  };

  const handleStop = () => {
    abortRef.current?.();
    abortRef.current = null;
    setStatus(text ? "done" : "idle");
  };

  const handleClear = () => {
    deleteBrief(key);
    setText("");
    setUsage(null);
    setBriefMeta(null);
    setBriefId(null);
    setStatus("idle");
    setError(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const html = useMemo(() => {
    if (!text) return "";
    const raw = marked.parse(text, { gfm: true, breaks: false, async: false }) as string;
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  }, [text]);

  return (
    <Card className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-heading">Generated Brief</h3>
          <p className="text-xs text-subtle mt-0.5">
            {status === "streaming" && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                Streaming from claude-opus-4-7…
              </span>
            )}
            {status === "done" && (
              <span>
                {briefMeta && (
                  <>
                    {briefMeta.byName ? `Generated by ${briefMeta.byName} · ` : ""}
                    {timeAgo(briefMeta.generatedAt)}
                    {usage ? " · " : ""}
                  </>
                )}
                {usage && (
                  <>
                    {usage.output.toLocaleString()} tokens · cache{" "}
                    {usage.cache_read.toLocaleString()} / {usage.cache_write.toLocaleString()}
                  </>
                )}
              </span>
            )}
            {status === "idle" && "Generate a closer-call brief from this firm's probe data"}
            {status === "error" && (
              <span className="text-[var(--color-danger)]">{error}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {status === "streaming" && (
            <Button variant="neutral" size="sm" onClick={handleStop}>Stop</Button>
          )}
          {status === "done" && text && (
            <>
              <Button variant="ghost" size="sm" onClick={handleCopy}>📋 Copy</Button>
              <Button variant="ghost" size="sm" onClick={handleClear}>↻ Regenerate</Button>
            </>
          )}
          {(status === "idle" || status === "error") && (
            <CTAButton size="sm" onClick={handleGenerate}>
              {status === "error" ? "Retry" : "Generate Brief"}
            </CTAButton>
          )}
        </div>
      </header>

      {(status === "streaming" || status === "done") && text && (
        <div
          ref={scrollRef}
          className="prose-llg max-h-[60vh] overflow-y-auto scrollbar-thin border border-[var(--color-border)] rounded-[6px] p-4 bg-surface shadow-inset"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {status === "done" && briefId && activeAssessmentId && (
        <BriefFeedback briefId={briefId} assessmentId={activeAssessmentId} />
      )}

      {status === "streaming" && !text && (
        <div className="border border-[var(--color-border)] rounded-[6px] p-4 bg-surface shadow-inset">
          <div className="flex items-center gap-2 text-subtle text-sm">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            Reasoning…
          </div>
        </div>
      )}

      {status === "idle" && !text && (
        <div className="border border-dashed border-[var(--color-border-strong)] rounded-[6px] p-6 text-center">
          <p className="text-sm text-subtle mb-1">No brief generated yet for this firm.</p>
          <p className="text-xs text-subtle">
            Click <span className="font-semibold text-heading">Generate Brief</span> to stream a
            closer-call briefing from {report.firm.name}'s probe data.
          </p>
        </div>
      )}
    </Card>
  );
}
