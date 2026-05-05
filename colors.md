# Color Tokens

## Background Tokens

### Surface
| Token | Light | Dark |
|---|---|---|
| neutral-primary-soft | #ECF0F3 | #262833 |

**CRITICAL RULE:** In pure neumorphism, there is ONLY ONE background color for the entire UI. The page background, cards, buttons, inputs, and sidebars MUST ALL USE `neutral-primary-soft`. Do NOT use different background colors to differentiate elements. Depth and separation are created EXCLUSIVELY through shadows (`shadow-sm`, `shadow-md`, `shadow-inset`).

## Brand Palette (LLG)

| Token | Hex | Role |
|---|---|---|
| brand-primary | #0F172A | Dark navy — primary heading and text |
| brand-secondary | #F05A28 | Terracotta orange — primary action / brand CTA |
| brand-tertiary | #231500 | Deep brown — accent emphasis |
| brand-neutral | #787878 | Mid-gray — disabled, muted supporting text |

### Text Color Tokens

| Token | Light | Dark |
|---|---|---|
| heading | #0F172A | #ECF0F3 |
| body | #334155 | #B8BFC9 |
| body-subtle | #64748B | #93A5BE |
| color-brand | #F05A28 | #F05A28 |
| color-secondary | #231500 | #C9A678 |
| fg-disabled | #787878 | #5A5A5A |

## Semantic Usage Rules

- **Backgrounds:** EVERY element (page, sidebar, card, button, input, badge) uses `neutral-primary-soft`. Backgrounds MUST remain in the neumorphic style.
- **Text & Icons:** Links, charts, icons, headings, and paragraphs should use the foreground colors (`color-brand`, `color-secondary`, `heading`, `body`) to convey meaning and state.
- **Primary elements:** Links, primary icons, and primary buttons use `neutral-primary-soft` background + `shadow-sm` + `color-brand` text/icon color.
- **Secondary elements:** Secondary icons, charts, and secondary buttons use `color-secondary` text/icon color.
- **Active/Pressed states:** `neutral-primary-soft` background + `shadow-inset`.
- **Headings:** `heading` text color.
- **Body text:** `body` text color.
- **Status:** Conveyed via `color-brand` (positive/primary) or `color-secondary` (negative/secondary) text color, icon color, or chart fill colors, NEVER via background color.

## Prohibited

- NO solid colored backgrounds for buttons, badges, or cards.
- NO alternating background colors for sections.
- NO raw hex/rgb values in component code.
