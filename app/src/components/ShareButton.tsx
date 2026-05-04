import { useState } from "react";
import { buildShareUrl, encodeShare } from "../lib/share";
import type { ProbeReport } from "../types";

interface ShareButtonProps {
  report: ProbeReport;
  variant?: "icon" | "full";
  className?: string;
}

export function ShareButton({ report, variant = "icon", className = "" }: ShareButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const handleClick = async () => {
    try {
      const encoded = await encodeShare(report);
      const url = buildShareUrl(encoded);

      // Try the Web Share API first (mobile native sheet); fall back to clipboard.
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share({
          title: `Firm Briefing — ${report.firm.name}`,
          text: `${report.firm.name} • ${report.firm.city}, ${report.firm.state}`,
          url,
        });
        setState("copied");
      } else {
        await navigator.clipboard.writeText(url);
        setState("copied");
      }
      setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2200);
    }
  };

  const label = state === "copied" ? "Link copied" : state === "error" ? "Couldn't copy" : "Share Link";

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        aria-label={label}
        title={label}
        className={[
          "w-8 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md active:nm-inset",
          "transition-all duration-200 flex items-center justify-center text-sm",
          state === "copied" ? "text-[var(--color-success)]" : "text-subtle",
          className,
        ].join(" ")}
      >
        {state === "copied" ? "✓" : "↑"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={[
        "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium",
        "bg-surface rounded-[8px] border border-[var(--color-border)]",
        "shadow-sm hover:shadow-md active:nm-inset transition-all duration-200",
        state === "copied" ? "text-[var(--color-success)]" : "text-body",
        className,
      ].join(" ")}
    >
      {state === "copied" ? "✓ Link copied" : "↑ Share link"}
    </button>
  );
}
