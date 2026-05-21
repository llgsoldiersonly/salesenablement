import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER, type LeadStatus } from "../../lib/leads";

interface StatusStyle {
  dot: string;
  text: string;
  bg: string;
  ring: string;
}

const STATUS_STYLE: Record<LeadStatus, StatusStyle> = {
  blank:               { dot: "bg-[var(--color-disabled)]", text: "text-subtle",                 bg: "bg-[var(--color-border)]",                ring: "ring-[var(--color-border-strong)]" },
  emailed:             { dot: "bg-sky-500",                  text: "text-sky-700",                bg: "bg-sky-500/10",                           ring: "ring-sky-500/30" },
  spoke_with_attorney: { dot: "bg-amber-500",                text: "text-amber-700",              bg: "bg-amber-500/10",                         ring: "ring-amber-500/30" },
  zoom_scheduled:      { dot: "bg-violet-500",               text: "text-violet-700",             bg: "bg-violet-500/10",                        ring: "ring-violet-500/30" },
  post_zoom:           { dot: "bg-fuchsia-500",              text: "text-fuchsia-700",            bg: "bg-fuchsia-500/10",                       ring: "ring-fuchsia-500/30" },
  second_zoom:         { dot: "bg-indigo-500",               text: "text-indigo-700",             bg: "bg-indigo-500/10",                        ring: "ring-indigo-500/30" },
  lost_lead:           { dot: "bg-[var(--color-danger)]",    text: "text-[var(--color-danger)]",  bg: "bg-[var(--color-danger)]/10",             ring: "ring-[var(--color-danger)]/30" },
  signed:              { dot: "bg-[var(--color-success)]",   text: "text-[var(--color-success)]", bg: "bg-[var(--color-success)]/10",            ring: "ring-[var(--color-success)]/30" },
};

export function statusStyle(status: LeadStatus): StatusStyle {
  return STATUS_STYLE[status];
}

interface StatusBadgeProps {
  status: LeadStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const style = STATUS_STYLE[status];
  const sizeCls = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        "ring-1 ring-inset",
        sizeCls,
        style.bg,
        style.text,
        style.ring,
      ].join(" ")}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {LEAD_STATUS_LABEL[status]}
    </span>
  );
}

interface StatusDropdownProps {
  value: LeadStatus;
  onChange: (next: LeadStatus) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

/** Inline-edit dropdown that styles itself like a StatusBadge for the
 *  selected status. Native select is used so it works on mobile + keyboard. */
export function StatusDropdown({ value, onChange, disabled, size = "md" }: StatusDropdownProps) {
  const style = STATUS_STYLE[value];
  const sizeCls = size === "sm" ? "text-[10px] px-1.5 py-0.5 pr-5" : "text-xs px-2 py-1 pr-6";
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LeadStatus)}
        disabled={disabled}
        className={[
          "appearance-none rounded-full font-medium whitespace-nowrap cursor-pointer",
          "ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-brand",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          sizeCls,
          style.bg,
          style.text,
          style.ring,
        ].join(" ")}
      >
        {LEAD_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <span className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 ${style.text} text-[10px]`}>
        ▾
      </span>
    </div>
  );
}
