import type { ReactNode } from "react";

/**
 * Badges — per badges.md.
 *
 * Variants: brand, alternative, gray, danger, success, warning, dark, navy.
 * Sizes: sm (default), lg.
 * Pill modifier swaps 8px radius for 9999px.
 */

type BadgeVariant =
  | "default"
  | "brand"
  | "alternative"
  | "gray"
  | "danger"
  | "success"
  | "warning"
  | "dark"
  | "navy";

type BadgeSize = "sm" | "lg";

const variantClasses: Record<BadgeVariant, string> = {
  // Kept for backwards compat — same as "gray"
  default:     "bg-neutral-secondary-medium text-heading border-[var(--color-border-default)]",
  brand:       "bg-brand-softer text-fg-brand-strong border-[var(--color-border-brand-subtle)]",
  alternative: "bg-neutral-primary-soft text-heading border-[var(--color-border-default)]",
  gray:        "bg-neutral-secondary-medium text-heading border-[var(--color-border-default)]",
  danger:      "bg-danger-soft text-fg-danger-strong border-[var(--color-border-danger-subtle)]",
  success:     "bg-success-soft text-fg-success-strong border-[var(--color-border-success-subtle)]",
  warning:     "bg-warning-soft text-fg-warning border-[var(--color-border-warning-subtle)]",
  dark:        "bg-[var(--color-dark)] text-white border-transparent",
  navy:        "bg-[var(--color-dark-strong)] text-white border-transparent",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-xs",
  lg: "px-2 py-1 text-sm",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  pill?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  pill = false,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 whitespace-nowrap",
        pill ? "rounded-full" : "rounded-[8px]",
        "border font-medium",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

/**
 * DotBadge — pill with a colored leading dot.
 * Used for live status indicators (e.g. "Closer Call Active").
 */
export function DotBadge({
  color = "green",
  label,
}: {
  color?: "green" | "orange" | "gray" | "red";
  label: string;
}) {
  const dotMap: Record<string, string> = {
    green:  "bg-[var(--color-success)]",
    orange: "bg-brand",
    gray:   "bg-[var(--color-gray)]",
    red:    "bg-[var(--color-danger)]",
  };
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-[var(--color-border-default)] bg-neutral-primary-soft text-xs font-medium text-body">
      <span className={`w-1.5 h-1.5 rounded-full ${dotMap[color] ?? "bg-[var(--color-gray)]"}`} />
      {label}
    </span>
  );
}
