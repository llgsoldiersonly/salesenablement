import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // All token names map to CSS custom properties defined in globals.css.
        // Never use raw hex here — the CSS vars handle light/dark automatically.
        surface: "var(--color-surface)",
        heading: "var(--color-heading)",
        body: "var(--color-body)",
        subtle: "var(--color-body-subtle)",
        brand: "var(--color-brand)",
        secondary: "var(--color-secondary)",
        disabled: "var(--color-disabled)",
        border: "var(--color-border)",
      },
      boxShadow: {
        // Neumorphic elevation tokens — dual-directional (dark bottom-right, light top-left)
        "2xs": "1px 1px 2px #b8b9be, -1px -1px 2px #ffffff",
        xs: "2px 2px 4px #b8b9be, -2px -2px 4px #ffffff",
        sm: "3px 3px 6px #b8b9be, -3px -3px 6px #ffffff",
        md: "6px 6px 12px #b8b9be, -6px -6px 12px #ffffff",
        lg: "8px 8px 16px #b8b9be, -8px -8px 16px #ffffff",
        xl: "10px 10px 20px #b8b9be, -10px -10px 20px #ffffff",
        "2xl": "12px 12px 24px #b8b9be, -12px -12px 24px #ffffff",
        inset: "inset 2px 2px 5px #b8b9be, inset -3px -3px 7px #ffffff",
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "8px",
        base: "8px",
        default: "6px",
        full: "9999px",
      },
      fontFamily: {
        sans: ['"Nunito Sans"', "sans-serif"],
      },
      fontSize: {
        "2xs": ["11px", "1.4"],
      },
      width: {
        sidebar: "256px",
        "right-rail": "288px",
      },
    },
  },
} satisfies Config;
