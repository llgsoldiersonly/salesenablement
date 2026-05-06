import { useEffect, useState } from "react";
import {
  clearBriefFeedback,
  getBriefFeedback,
  setBriefFeedback,
  type BriefFeedbackSummary,
  type Rating,
} from "../lib/briefFeedback";

interface BriefFeedbackProps {
  briefId: string;
  assessmentId: string;
}

export function BriefFeedback({ briefId, assessmentId }: BriefFeedbackProps) {
  const [summary, setSummary] = useState<BriefFeedbackSummary | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getBriefFeedback(briefId).then((s) => {
      if (!cancelled) setSummary(s);
    });
    return () => {
      cancelled = true;
    };
  }, [briefId]);

  const setRating = async (rating: Rating) => {
    if (busy) return;
    setBusy(true);
    if (summary?.myRating === rating) {
      // Toggle off
      await clearBriefFeedback(briefId);
    } else {
      await setBriefFeedback(briefId, assessmentId, rating);
      if (rating === -1) setShowComment(true);
    }
    setSummary(await getBriefFeedback(briefId));
    setBusy(false);
  };

  const submitComment = async () => {
    if (!comment.trim() || busy) return;
    setBusy(true);
    await setBriefFeedback(briefId, assessmentId, -1, comment.trim());
    setSummary(await getBriefFeedback(briefId));
    setShowComment(false);
    setComment("");
    setBusy(false);
  };

  if (!summary) return null;

  const upActive = summary.myRating === 1;
  const downActive = summary.myRating === -1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-2xs uppercase tracking-wider text-subtle font-semibold mr-1">
          Was this useful?
        </span>
        <button
          onClick={() => void setRating(1)}
          disabled={busy}
          aria-pressed={upActive}
          className={[
            "px-2 py-0.5 rounded-full border text-xs font-medium transition-colors disabled:opacity-50",
            upActive
              ? "bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/40"
              : "bg-surface text-subtle border-[var(--color-border)] hover:text-heading",
          ].join(" ")}
          title="Helpful"
        >
          👍 {summary.upCount > 0 ? summary.upCount : ""}
        </button>
        <button
          onClick={() => void setRating(-1)}
          disabled={busy}
          aria-pressed={downActive}
          className={[
            "px-2 py-0.5 rounded-full border text-xs font-medium transition-colors disabled:opacity-50",
            downActive
              ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/40"
              : "bg-surface text-subtle border-[var(--color-border)] hover:text-heading",
          ].join(" ")}
          title="Not useful"
        >
          👎 {summary.downCount > 0 ? summary.downCount : ""}
        </button>
      </div>
      {showComment && downActive && (
        <div className="flex flex-col gap-2 pt-1">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was missing or wrong? (optional)"
            className="w-full bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-xs text-body resize-none outline-none focus:ring-2 focus:ring-brand"
            rows={2}
            maxLength={500}
            disabled={busy}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowComment(false);
                setComment("");
              }}
              disabled={busy}
              className="text-2xs uppercase tracking-wider font-semibold text-subtle hover:text-heading"
            >
              Skip
            </button>
            <button
              onClick={() => void submitComment()}
              disabled={!comment.trim() || busy}
              className="text-2xs uppercase tracking-wider font-semibold text-brand hover:text-brand/80 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
