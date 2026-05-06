import { useEffect, useRef, useState } from "react";
import { streamAsk } from "../../lib/streamAsk";
import type { AskContext } from "../../../server/ask-handler";

interface AskAIPanelProps {
  context: AskContext;
  /** compact = inside live cockpit, default = idle right rail */
  compact?: boolean;
}

type State = "idle" | "loading" | "streaming" | "done" | "error";

export function AskAIPanel({ context, compact = false }: AskAIPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<(() => void) | null>(null);
  const answerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.(); };
  }, []);

  // Scroll answer into view as it streams
  useEffect(() => {
    if (answer) answerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [answer]);

  const handleSubmit = async () => {
    const q = question.trim();
    if (!q || state === "loading" || state === "streaming") return;

    abortRef.current?.();
    setAnswer("");
    setErrorMsg("");
    setState("loading");

    const handle = streamAsk(q, context);
    abortRef.current = handle.abort;

    try {
      for await (const event of handle.events) {
        if (event.type === "text") {
          setState("streaming");
          setAnswer((prev) => prev + event.data);
        } else if (event.type === "done") {
          setState("done");
        } else if (event.type === "error") {
          setState("error");
          setErrorMsg(event.message);
        }
      }
      if (state !== "error") setState("done");
    } catch {
      setState("done");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleClear = () => {
    abortRef.current?.();
    setQuestion("");
    setAnswer("");
    setErrorMsg("");
    setState("idle");
    textareaRef.current?.focus();
  };

  const busy = state === "loading" || state === "streaming";
  const hasAnswer = answer.length > 0 || state === "error";

  return (
    <div className="flex flex-col gap-2">
      {/* Input row */}
      <div className="flex gap-1.5">
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          rows={compact ? 2 : 3}
          placeholder="Ask anything — objection help, pitch angle, how to close…"
          className="flex-1 bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-2.5 py-2 text-xs text-body resize-none outline-none focus:ring-2 focus:ring-brand placeholder:text-subtle disabled:opacity-50"
        />
        <div className="flex flex-col gap-1">
          <button
            onClick={() => void handleSubmit()}
            disabled={!question.trim() || busy}
            className="shrink-0 px-2.5 py-1.5 rounded-[6px] bg-brand text-white text-xs font-semibold disabled:opacity-40 hover:brightness-110 transition-all"
          >
            {busy ? "…" : "Ask"}
          </button>
          {hasAnswer && (
            <button
              onClick={handleClear}
              className="shrink-0 px-2.5 py-1.5 rounded-[6px] bg-surface border border-[var(--color-border)] text-xs text-subtle hover:text-body transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Answer area */}
      {hasAnswer && (
        <div
          ref={answerRef}
          className={[
            "rounded-[8px] border px-3 py-2.5 text-xs leading-relaxed",
            state === "error"
              ? "bg-[#FEF2F2] border-[var(--color-danger)]/30 text-[var(--color-danger)]"
              : "bg-surface-2 border-[var(--color-border)] text-body",
          ].join(" ")}
        >
          {state === "error" ? (
            <p>{errorMsg || "Something went wrong. Try again."}</p>
          ) : (
            <p className="whitespace-pre-wrap">
              {answer}
              {state === "streaming" && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-brand animate-pulse rounded-sm align-middle" />
              )}
            </p>
          )}
        </div>
      )}

      {state === "loading" && !hasAnswer && (
        <div className="flex items-center gap-1.5 px-1 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "300ms" }} />
          <span className="text-2xs text-subtle ml-1">Thinking…</span>
        </div>
      )}

      <p className="text-2xs text-subtle">Enter to send · Shift+Enter for newline</p>
    </div>
  );
}
