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
        // Neumorphic elevation tokens — dual-directional (dark bottom-right, light top-left).
        // Colors come from CSS vars in globals.css so light/dark themes swap automatically.
        "2xs": "1px 1px 2px var(--nm-shadow-dark), -1px -1px 2px var(--nm-shadow-light)",
        xs: "2px 2px 4px var(--nm-shadow-dark), -2px -2px 4px var(--nm-shadow-light)",
        sm: "3px 3px 6px var(--nm-shadow-dark), -3px -3px 6px var(--nm-shadow-light)",
        md: "6px 6px 12px var(--nm-shadow-dark), -6px -6px 12px var(--nm-shadow-light)",
        lg: "8px 8px 16px var(--nm-shadow-dark), -8px -8px 16px var(--nm-shadow-light)",
        xl: "10px 10px 20px var(--nm-shadow-dark), -10px -10px 20px var(--nm-shadow-light)",
        "2xl": "12px 12px 24px var(--nm-shadow-dark), -12px -12px 24px var(--nm-shadow-light)",
        inset: "inset 2px 2px 5px var(--nm-shadow-dark), inset -3px -3px 7px var(--nm-shadow-light)",
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
