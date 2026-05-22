import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER, type LeadStatus } from "../../lib/leads";

/**
 * Lead-status pill + inline status dropdown.
 *
 * Status colors map to the design system status palette where possible
 * (lost → danger, signed → success) and to accent hues from colors.md for
 * the pipeline-only states (emailed, spoke, zooms).
 */

interface StatusStyle {
  dot: string;
  text: string;
  bg: string;
  ring: string;
}

const STATUS_STYLE: Record<LeadStatus, StatusStyle> = {
  blank: {
    dot: "bg-[var(--color-gray)]",
    text: "text-body-subtle",
    bg: "bg-neutral-secondary-medium",
    ring: "ring-[var(--color-border-default)]",
  },
  emailed: {
    dot: "bg-sky-500",
    text: "text-sky-700",
    bg: "bg-sky-50",
    ring: "ring-sky-200",
  },
  spoke_with_attorney: {
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
  },
  zoom_scheduled: {
    dot: "bg-violet-500",
    text: "text-violet-700",
    bg: "bg-violet-50",
    ring: "ring-violet-200",
  },
  post_zoom: {
    dot: "bg-fuchsia-500",
    text: "text-fuchsia-700",
    bg: "bg-fuchsia-50",
    ring: "ring-fuchsia-200",
  },
  second_zoom: {
    dot: "bg-indigo-500",
    text: "text-indigo-700",
    bg: "bg-indigo-50",
    ring: "ring-indigo-200",
  },
  lost_lead: {
    dot: "bg-[var(--color-danger)]",
    text: "text-fg-danger-strong",
    bg: "bg-danger-soft",
    ring: "ring-[var(--color-border-danger-subtle)]",
  },
  signed: {
    dot: "bg-[var(--color-success)]",
    text: "text-fg-success-strong",
    bg: "bg-success-soft",
    ring: "ring-[var(--color-border-success-subtle)]",
  },
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

/**
 * Native-select dropdown styled as a status pill. Reliable on mobile and
 * keyboard, looks like the StatusBadge for the selected value.
 */
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
          "ring-1 ring-inset",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors duration-150",
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
