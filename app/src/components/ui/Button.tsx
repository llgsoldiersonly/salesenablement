import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "brand" | "neutral" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  brand:   "text-brand font-medium",
  neutral: "text-heading font-medium",
  ghost:   "text-body shadow-none hover:shadow-sm",
  danger:  "text-[var(--color-danger)] font-medium",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-base",
};

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
        "bg-surface rounded-[8px] border border-[var(--color-border)]",
        "shadow-sm hover:shadow-md active:nm-inset",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
        variantClasses[variant],
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

/* Special CTA button — solid brand background (used for "NEW ASSESSMENT" and "CLOSE DEAL") */
export function CTAButton({
  children,
  size = "md",
  className = "",
  ...props
}: Omit<ButtonProps, "variant">) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2",
        "bg-brand text-white font-semibold uppercase tracking-wide",
        "rounded-[8px] shadow-sm hover:shadow-md active:nm-inset",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
