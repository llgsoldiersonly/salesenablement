import type { ReactNode } from "react";

type BadgeVariant = "default" | "brand" | "success" | "warning" | "danger" | "navy";

const variantClasses: Record<BadgeVariant, string> = {
  default:  "text-subtle border-[var(--color-border)]",
  brand:    "text-brand border-brand/30",
  success:  "text-[var(--color-success)] border-[var(--color-success)]/30",
  warning:  "text-[var(--color-warning)] border-[var(--color-warning)]/30",
  danger:   "text-[var(--color-danger)] border-[var(--color-danger)]/30",
  navy:     "bg-[#0F172A] text-white border-transparent",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1",
        "px-2 py-0.5 rounded-[6px] border",
        "text-xs font-medium uppercase tracking-wide",
        "bg-surface",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function DotBadge({ color = "green", label }: { color?: string; label: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-[var(--color-success)]",
    orange: "bg-brand",
    gray: "bg-disabled",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle uppercase tracking-wide border border-[var(--color-border)] bg-surface px-2.5 py-1 rounded-full">
      <span className={`w-1.5 h-1.5 rounded-full ${colorMap[color] ?? "bg-gray-400"}`} />
      {label}
    </span>
  );
}
