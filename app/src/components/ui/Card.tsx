import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  accent?: boolean; /* left brand-color border */
  dark?: boolean;   /* inverted navy background for market leader cards */
}

export function Card({ children, className = "", interactive = false, accent = false, dark = false }: CardProps) {
  const base = "rounded-[8px] border border-[var(--color-border)] p-4";
  const surface = dark
    ? "bg-[#0F172A] text-[#ECF0F3]"
    : "bg-surface";
  const shadow = interactive
    ? "shadow-sm hover:shadow-md active:nm-inset transition-shadow duration-200 cursor-pointer"
    : "shadow-md";
  const accentClass = accent ? "border-l-[3px] border-l-brand" : "";
  return (
    <div className={`${base} ${surface} ${shadow} ${accentClass} ${className}`}>
      {children}
    </div>
  );
}
