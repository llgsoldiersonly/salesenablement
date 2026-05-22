import type { Config } from "tailwindcss";

/**
 * Tailwind theme — maps utility classes onto the CSS custom properties
 * defined in src/styles/globals.css. Never put raw hex values here; let
 * the design tokens flow through so light/dark themes and brand changes
 * work without touching this file.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Backwards-compat / common semantic aliases used across the app
        surface:  "var(--color-neutral-primary-soft)",
        heading:  "var(--color-heading)",
        body:     "var(--color-body)",
        subtle:   "var(--color-body-subtle)",
        brand:    "var(--color-brand)",
        secondary: "var(--color-body-subtle)",
        disabled: "var(--color-fg-disabled)",
        border:   "var(--color-border-default)",

        // Design-system tokens, exposed as Tailwind colors
        // Use these for new components.
        "neutral-primary-soft":     "var(--color-neutral-primary-soft)",
        "neutral-primary":          "var(--color-neutral-primary)",
        "neutral-primary-medium":   "var(--color-neutral-primary-medium)",
        "neutral-secondary-soft":   "var(--color-neutral-secondary-soft)",
        "neutral-secondary":        "var(--color-neutral-secondary)",
        "neutral-secondary-medium": "var(--color-neutral-secondary-medium)",
        "neutral-tertiary-soft":    "var(--color-neutral-tertiary-soft)",
        "neutral-tertiary":         "var(--color-neutral-tertiary)",
        "neutral-tertiary-medium":  "var(--color-neutral-tertiary-medium)",
        "neutral-quaternary":       "var(--color-neutral-quaternary)",

        "brand-softer":  "var(--color-brand-softer)",
        "brand-soft":    "var(--color-brand-soft)",
        "brand-medium":  "var(--color-brand-medium)",
        "brand-strong":  "var(--color-brand-strong)",

        "success-soft":   "var(--color-success-soft)",
        success:          "var(--color-success)",
        "success-medium": "var(--color-success-medium)",
        "success-strong": "var(--color-success-strong)",
        "danger-soft":    "var(--color-danger-soft)",
        danger:           "var(--color-danger)",
        "danger-medium":  "var(--color-danger-medium)",
        "danger-strong":  "var(--color-danger-strong)",
        "warning-soft":   "var(--color-warning-soft)",
        warning:          "var(--color-warning)",
        "warning-medium": "var(--color-warning-medium)",
        "warning-strong": "var(--color-warning-strong)",

        "fg-brand":          "var(--color-fg-brand)",
        "fg-brand-strong":   "var(--color-fg-brand-strong)",
        "fg-success":        "var(--color-fg-success)",
        "fg-success-strong": "var(--color-fg-success-strong)",
        "fg-danger":         "var(--color-fg-danger)",
        "fg-danger-strong":  "var(--color-fg-danger-strong)",
        "fg-warning":        "var(--color-fg-warning)",
        "fg-disabled":       "var(--color-fg-disabled)",
      },
      boxShadow: {
        // Modern elevation scale (per shadows.md). Values resolve through
        // CSS variables so they can be retuned per-theme later if needed.
        "2xs":  "var(--shadow-2xs)",
        xs:     "var(--shadow-xs)",
        sm:     "var(--shadow-sm)",
        md:     "var(--shadow-md)",
        lg:     "var(--shadow-lg)",
        xl:     "var(--shadow-xl)",
        "2xl":  "var(--shadow-2xl)",
        inset:  "var(--shadow-inset)",
      },
      borderRadius: {
        sm:      "4px",
        DEFAULT: "8px",
        base:    "8px",
        default: "8px",
        full:    "9999px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          '"Fira Code"',
          '"Cascadia Code"',
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["11px", "1.4"],
      },
      width: {
        sidebar: "256px",
        "right-rail": "288px",
      },
      ringColor: {
        brand:        "var(--color-brand)",
        "brand-soft": "var(--color-brand-soft)",
      },
    },
  },
} satisfies Config;
