import { useState } from "react";
import { dialPhone } from "../../lib/ringcentral";

interface CallButtonProps {
  phone: string | null | undefined;
  leadId?: string;
  /** "icon" = compact phone icon; "inline" = phone number text + icon button */
  variant?: "icon" | "inline";
}

/**
 * Click-to-dial via RingCentral RingOut. Server initiates a 2-leg call —
 * RC rings the rep's RC phone first, then bridges to the prospect.
 *
 * If the rep hasn't connected RingCentral, the server returns an error
 * containing a hint we surface to the rep.
 */
export function CallButton({ phone, leadId, variant = "icon" }: CallButtonProps) {
  const [state, setState] = useState<"idle" | "dialing" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!phone) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === "dialing") return;
    setState("dialing");
    setMessage(null);
    const result = await dialPhone(phone, leadId);
    if (result.ok) {
      setState("success");
      setMessage("Ringing your RC phone…");
      setTimeout(() => setState("idle"), 4000);
    } else {
      setState("error");
      setMessage(result.hint ?? result.error ?? "Dial failed");
      setTimeout(() => {
        setState("idle");
        setMessage(null);
      }, 6000);
    }
  };

  const ariaLabel = `Call ${phone} via RingCentral`;
  const title =
    state === "success"
      ? message ?? "Ringing"
      : state === "error"
        ? message ?? "Failed"
        : `Call ${phone}`;

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span>{phone}</span>
        <CallIconButton onClick={handleClick} state={state} title={title} ariaLabel={ariaLabel} />
        {message && state !== "idle" && (
          <span className={`text-2xs ${state === "error" ? "text-fg-danger" : "text-fg-success"}`}>
            {message}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <CallIconButton onClick={handleClick} state={state} title={title} ariaLabel={ariaLabel} />
      {message && state !== "idle" && (
        <span className={`text-2xs ${state === "error" ? "text-fg-danger" : "text-fg-success"}`}>
          {message}
        </span>
      )}
    </span>
  );
}

interface IconButtonProps {
  onClick: (e: React.MouseEvent) => void;
  state: "idle" | "dialing" | "success" | "error";
  title: string;
  ariaLabel: string;
}

function CallIconButton({ onClick, state, title, ariaLabel }: IconButtonProps) {
  const colorCls =
    state === "success"
      ? "bg-success-soft text-fg-success-strong ring-[var(--color-border-success-subtle)]"
      : state === "error"
        ? "bg-danger-soft text-fg-danger-strong ring-[var(--color-border-danger-subtle)]"
        : "bg-brand-softer text-fg-brand-strong ring-[var(--color-border-brand-subtle)] hover:bg-brand-soft";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      disabled={state === "dialing"}
      className={[
        "inline-flex items-center justify-center w-6 h-6 rounded-full",
        "ring-1 ring-inset transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-brand",
        "disabled:opacity-60 disabled:cursor-wait",
        colorCls,
      ].join(" ")}
    >
      {state === "dialing" ? (
        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : (
        <span className="text-xs leading-none" aria-hidden>
          ☎
        </span>
      )}
    </button>
  );
}
