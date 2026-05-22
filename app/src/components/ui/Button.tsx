import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Buttons — per buttons.md.
 *
 * Filled variants (brand, success, danger, warning, dark) get the glint
 * effect: shadow-xs base + inset highlight + subtle outer glow. Outlined
 * variants (secondary, tertiary/neutral) use a flat border + glint. Ghost
 * has no shadow or glint. Disabled overrides everything.
 *
 * Variant aliases:
 *   neutral  → tertiary  (kept for backwards compatibility with existing call sites)
 */

type Variant =
  | "brand"
  | "secondary"
  | "tertiary"
  | "neutral"
  | "success"
  | "danger"
  | "warning"
  | "dark"
  | "ghost";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
}

// Filled variants get the glint shadow layered on top of shadow-xs.
const FILLED = "btn-glint";

const variantClasses: Record<Variant, string> = {
  brand:
    "bg-brand text-white border-transparent " +
    "hover:bg-brand-strong " +
    "focus-visible:ring-4 focus-visible:ring-brand-medium " +
    FILLED,
  secondary:
    "bg-neutral-secondary-medium text-body border-[var(--color-border-default-medium)] " +
    "hover:bg-neutral-tertiary-medium hover:text-heading " +
    "focus-visible:ring-4 focus-visible:ring-[var(--color-neutral-tertiary)] " +
    FILLED,
  tertiary:
    "bg-neutral-primary-soft text-body border-[var(--color-border-default)] " +
    "hover:bg-neutral-secondary-medium hover:text-heading " +
    "focus-visible:ring-4 focus-visible:ring-[var(--color-neutral-tertiary-soft)] " +
    FILLED,
  neutral: // alias for tertiary — existing call sites
    "bg-neutral-primary-soft text-body border-[var(--color-border-default)] " +
    "hover:bg-neutral-secondary-medium hover:text-heading " +
    "focus-visible:ring-4 focus-visible:ring-[var(--color-neutral-tertiary-soft)] " +
    FILLED,
  success:
    "bg-success text-white border-transparent " +
    "hover:bg-success-strong " +
    "focus-visible:ring-4 focus-visible:ring-success-medium " +
    FILLED,
  danger:
    "bg-danger text-white border-transparent " +
    "hover:bg-danger-strong " +
    "focus-visible:ring-4 focus-visible:ring-danger-medium " +
    FILLED,
  warning:
    "bg-warning text-white border-transparent " +
    "hover:bg-warning-strong " +
    "focus-visible:ring-4 focus-visible:ring-warning-medium " +
    FILLED,
  dark:
    "bg-[var(--color-dark)] text-white border-transparent " +
    "hover:bg-[var(--color-dark-strong)] " +
    "focus-visible:ring-4 focus-visible:ring-[var(--color-neutral-tertiary)] " +
    FILLED,
  ghost:
    "bg-transparent text-heading border-transparent " +
    "hover:bg-neutral-secondary-medium " +
    "focus-visible:ring-4 focus-visible:ring-[var(--color-neutral-tertiary)]",
};

const sizeClasses: Record<Size, string> = {
  xs: "px-3 py-1.5 text-xs",
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
  xl: "px-6 py-3.5 text-base",
};

const disabledClasses =
  "disabled:bg-[var(--color-disabled)] disabled:text-[var(--color-fg-disabled)] " +
  "disabled:border-[var(--color-border-default-medium)] disabled:cursor-not-allowed " +
  "disabled:shadow-none disabled:hover:bg-[var(--color-disabled)] " +
  "disabled:hover:text-[var(--color-fg-disabled)]";

export function Button({
  variant = "neutral",
  size = "md",
  children,
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2",
        "rounded-[8px] border font-medium",
        "transition-colors duration-150",
        "focus-visible:outline-none",
        variantClasses[variant],
        sizeClasses[size],
        disabledClasses,
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Canonical primary CTA — bg-brand, white text, glint.
 * Equivalent to `<Button variant="brand" size="lg" />` but kept as its own
 * export so existing call sites (Submit, Save Deal, Send Code, etc.) don't
 * need to be touched.
 */
export function CTAButton({
  children,
  size = "md",
  className = "",
  fullWidth = false,
  ...props
}: Omit<ButtonProps, "variant">) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2",
        "rounded-[8px] border border-transparent font-semibold",
        "bg-brand text-white",
        "hover:bg-brand-strong",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-medium",
        "btn-glint",
        disabledClasses,
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
