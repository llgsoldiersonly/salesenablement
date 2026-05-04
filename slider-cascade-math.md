# Slider Cascade Math & Visual Spec

This file contains the exact formulas, animation specs, and accessibility rules behind the dashboard's cascade system. Read this before wiring sliders to numbers in the HTML output.

---

## 1. The Three Tiers

| Tier | Examples | Effect |
|---|---|---|
| **Tier 1 — Per-Metric** | Score & Weight on a single audit row | Affects the row's category roll-up only |
| **Tier 2 — Per-Tab Driver** | Avg CPC, LP CR, Avg Deal Size | Affects multiple numbers within ONE tab; some feed Tier 3 |
| **Tier 3 — Global** | Monthly Budget, Target ROAS, Avg Quality Score | Cascades across multiple tabs |

The whole architecture exists to keep cognitive load on the prospect manageable. Globals are pinned (always visible). Drivers are at the top of each tab. Per-metric sliders are inside collapsible category cards.

---

## 2. Per-Metric Math (Tier 1)

```
category_score = Σ(metric_score_i × metric_weight_i) / Σ(metric_weight_i)
                  for all metrics where metric_weight_i > 0

tab_score      = Σ(category_score_j × category_weight_j) / Σ(category_weight_j)
                  for all categories where category_weight_j > 0

overall_score  = average(website_tab_score, seo_tab_score) on a 0–100 scale
```

**Weight 0 behavior:** the row collapses to a "[N/A — excluded]" stub, and is removed from both numerator and denominator. This is the "this client doesn't care about X" lever.

**Auto-zero niches:** If `niche.is_national_b2b` and `category.id == "local_seo"`, set `category_weight = 0` automatically and label `"N/A for this niche"`. Don't silently score 0 — that's misleading.

---

## 3. Driver Slider Math (Tier 2)

These formulas live inside one tab's compute function.

### 3.1 Tab 1 — Website Audit drivers

The drivers (Conversion Rate, Bounce Rate, Mobile Speed Score) are observational sliders — they capture today's state. They feed into Tab 5's funnel as the **starting** values for LP Conversion Rate (with a +1.5–3.5% lift band representing what the agency can move it to).

```
projected_lp_cr_low  = current_cr × 1.20    // +20% conservative
projected_lp_cr_mid  = current_cr × 1.50    // +50% realistic
projected_lp_cr_high = current_cr × 2.00    // 2x aggressive
```

### 3.2 Tab 5 — PPC Projections funnel

```
clicks   = monthly_budget / avg_cpc
leads    = clicks × lp_conversion_rate
customers = leads × lead_to_customer_rate
revenue  = customers × avg_deal_size
profit   = revenue × margin_pct − monthly_budget
roas     = revenue / monthly_budget
cpa      = monthly_budget / customers
```

### 3.3 Three-scenario fanning (always-on)

```
conservative = realistic × 0.75
realistic    = best_estimate
aggressive   = realistic × 1.25
```

Apply to clicks, leads, customers, revenue, profit. Render as three side-by-side columns.

---

## 4. Global Slider Math (Tier 3)

### 4.1 Monthly Budget global

Cascades into every Tab 5 number (clicks, leads, customers, revenue, profit, ROAS, CPA) and the Tab 6 budget pacing bar.

```
budget_pacing.seo_retainer  = monthly_budget × tab6.seo_share
budget_pacing.paid_media    = monthly_budget × tab6.paid_share
budget_pacing.content_prod  = monthly_budget × tab6.content_share
budget_pacing.tooling       = monthly_budget × tab6.tooling_share
                               // shares must sum to 1.0
```

### 4.2 Target ROAS global

Doesn't change the underlying numbers — it changes the **color band** applied to ROAS, profit, and CPA cells. It also drives a threshold narrative.

```
band(actual_roas):
    if actual_roas >= target_roas         → green  (#10b981)
    if actual_roas >= target_roas × 0.75  → amber  (#f59e0b)
    else                                  → red    (#ef4444)

cpa_target = avg_deal_size × margin_pct / target_roas
band(actual_cpa):
    if actual_cpa <= cpa_target          → green
    if actual_cpa <= cpa_target × 1.25   → amber
    else                                 → red
```

**Threshold narrative trigger:** when `target_roas >= 4.0 AND actual_roas >= target_roas`, show:

> "At ROAS {target_roas}x, scaling to ${monthly_budget × 4} is profitable at current funnel rates."

### 4.3 Avg Quality Score global

Cascades into Tab 4's effective CPC column AND into Tab 5's Avg CPC (since better QS lowers what you actually pay).

```
// Simplified Google Ads formula:
effective_cpc = (next_advertiser_bid × next_advertiser_qs) / your_qs + $0.01

// In our model we approximate "next advertiser" with niche median bid + median QS:
effective_cpc = (niche_median_bid × niche_median_qs) / qs_global + $0.01
```

When `qs_global` rises from 6 → 7, effective CPC drops by roughly 14%. From 7 → 8, another ~12%. Show this delta live.

**Threshold narrative trigger:** when `qs_global >= 7`, show:

> "At Quality Score {qs_global}, your effective CPC is below the niche median (${niche_median_bid})."

Tab 5's Avg CPC driver should auto-update when QS global changes — this is the cross-tab cascade in action.

---

## 5. Impact Chip Computation

Every cascading slider has a chip showing live delta vs. the "today" snapshot taken at dashboard load. Format: `+$X/mo` or `−$X/mo`, color-coded green for positive, red for negative.

```
on_slider_change(slider_id, new_value):
    snapshot = state_at_load
    current  = state_now
    delta = compute_downstream_metric(current) − compute_downstream_metric(snapshot)
    render_chip(slider_id, format_currency(delta))
```

Examples of what each slider's chip shows:

| Slider | Chip metric | Why |
|---|---|---|
| Monthly Budget (global) | Δ profit/mo | Profit is the bottom-line outcome |
| Target ROAS (global) | Δ profitable budget ceiling | "How much could I spend at this ROAS?" |
| Avg Quality Score (global) | Δ effective CPC | The most legible PPC outcome |
| LP Conversion Rate (Tab 5 driver) | Δ leads/mo | Direct funnel effect |
| Avg Deal Size (Tab 5 driver) | Δ revenue/mo | Direct revenue effect |
| Capture Rate at Rank 3 (Tab 3 driver) | Δ organic clicks/mo | Tab-specific outcome |

---

## 6. Pulse Animation Spec

When any slider moves, every affected number on screen briefly pulses.

```css
@keyframes pulse-cascade {
  0%   { transform: scale(1.00); color: var(--brand-primary); }
  50%  { transform: scale(1.06); color: var(--brand-primary); }
  100% { transform: scale(1.00); color: inherit; }
}

.cascading-number.is-pulsing {
  animation: pulse-cascade 350ms ease-out;
}
```

JS pattern:

```js
function pulse(elementId) {
  const el = document.getElementById(elementId);
  el.classList.remove('is-pulsing');
  void el.offsetWidth; // reflow trick to restart animation
  el.classList.add('is-pulsing');
}
```

Call `pulse()` for each affected element after recomputing values. Don't pulse more than ~12 elements at once on a single slider move — too many simultaneous pulses look chaotic.

---

## 7. Trace-Back Dots

Every output number has a row of small colored dots indicating which sliders feed it. Hovering a dot highlights the corresponding slider in the panel (CSS `:hover` on the dot adds a `.highlighted` class to the slider via JS).

```html
<span class="metric-with-trace">
  <span class="value" id="projected-leads">142</span>
  <span class="trace-dots">
    <span class="dot" data-source="slider-budget"  title="Monthly Budget"></span>
    <span class="dot" data-source="slider-cpc"     title="Avg CPC"></span>
    <span class="dot" data-source="slider-lp-cr"   title="LP Conversion Rate"></span>
  </span>
</span>
```

Color the dots by tier: globals = primary brand color, drivers = secondary brand color, per-metric = neutral gray.

---

## 8. Threshold Narratives

Each narrative is a one-liner that appears above the relevant slider when its threshold is crossed, fades in over 200ms, fades out when the threshold is no longer met.

Required narratives (minimum 5):

1. **ROAS profitable scaling** — `target_roas >= 4.0 && actual_roas >= target_roas` → "At ROAS X, scaling to $Y is profitable."
2. **Quality Score CPC inflection** — `qs_global >= 7` → "At QS X, your effective CPC is below the niche median."
3. **LP CR breakeven** — `lp_cr >= breakeven_cr` → "At LP CR X%, paid breakeven is at $Y spend."
4. **Capture Rate organic dominance** — `capture_rate >= 0.30` → "At capture rate X%, organic delivers 60%+ of leads."
5. **Budget threshold for AI tactics** — `monthly_budget >= 10000` → "Above $10K/mo, programmatic landing pages compound — phase 60–90."

Niche may add more (e.g., for local services: NAP consistency triggers a "GBP unlocked" narrative).

---

## 9. Lever Leaderboard

Per tab, sort the tab's drivers by **per-unit $-impact** computed live. Render the top 3 in a small panel at the top of the tab.

```
for each driver in tab.drivers:
    delta_per_unit = (compute_metric(driver.value + 0.05 × driver.range)
                      − compute_metric(driver.value)) / 0.05
    impact_score = abs(delta_per_unit) × downstream_weight
return top_3(by impact_score desc)
```

The leaderboard answers "which slider should I move first to change my business?" — a question every prospect silently asks.

---

## 10. Accessibility

- Every slider has a visible numeric value AND an `<input type="range">` (don't rely on color alone).
- Pulse animation respects `prefers-reduced-motion: reduce` — fall back to a 1-frame color flash with no transform.
- Color bands always pair with text labels (`Profitable` / `Marginal` / `Unprofitable`), not just red/amber/green.
- Trace-back dots have `title` attributes for screen readers.
- All buttons have visible focus rings using the brand primary color.
- Min contrast ratio 4.5:1 for body text on the brand background. If the prospect's primary color is light, switch to dark text and note the substitution.

---

## 11. Performance

- Single-page HTML, ~150–250 KB target.
- Tailwind via CDN (`https://cdn.tailwindcss.com` is the one allowed external dependency aside from Google Fonts).
- Vanilla JS, no React, no build step.
- Recompute pattern: on any slider input event, run `recomputeAll()` which is a single function that walks the state object and updates all derived numbers + pulses changed elements. Don't try to be clever with selective recomputes — recomputeAll is fast enough at this scale and avoids subtle bugs.

---

## 11.5. Tab 7 Competitor Cascade Math

The Competitor Analysis tab has its own driver math that ripples into other tabs. These are the formulas:

### 11.5.1 Competitive Intensity → Tab 3 difficulty

```
intensity_multiplier = 0.85 + (intensity_slider / 10) * 0.45
                       // 0.85x at intensity 0, 1.30x at intensity 10
adjusted_difficulty = base_difficulty × intensity_multiplier   // capped at 10
```

When intensity moves 5 → 9, difficulty for every keyword in the SEO Opportunities table increases by ~12%, which moves more keywords above the user's "Difficulty Tolerance" filter and trims the visible list.

### 11.5.2 Competitive Intensity → Tab 4 niche median bid

```
bid_multiplier = 0.92 + (intensity_slider / 10) * 0.23
                 // 0.92x at intensity 0, 1.15x at intensity 10
adjusted_niche_bid = NICHE_MEDIAN_BID × bid_multiplier
```

This flows through every effective-CPC calculation in the PPC Keyword table.

### 11.5.3 Map Pack Position Target → Tab 2 Local SEO weight

Local niches only. National niches ignore this slider entirely.

```
if niche.is_local:
    local_weight_multiplier = 1.7 - (target_position - 1) * 0.35
                              // target=1 → 1.70, target=2 → 1.35, target=3 → 1.00
    seo_local_category.weight = base_weight × local_weight_multiplier
```

Pushing the target to position 1 raises the local category's weight in the SEO score roll-up, which makes Tab 2's Local SEO metrics dominate the SEO Score gauge.

### 11.5.4 Differentiation Score ↔ Tab 1 differentiator clarity

Two-way sync. Moving the Tab 7 Differentiation slider sets `metrics['content.differ'].score` to the same value, and vice versa. Triggers a pulse on both ends.

### 11.5.5 Recommendations Summary → Tab 6 "Why this plan"

This is content-level, not numeric. The Tab 7 Recommendations paragraph is the source for Tab 6's "Why this plan" bullet 1 (with optional human edit before sending). The dashboard renders it once in Tab 7 and references it in Tab 6 with a "from competitor analysis" footnote.

### 11.5.6 Visual cascade

When any Tab 7 driver moves:
- Pulse: the affected outputs in Tab 3 (filtered keyword count), Tab 4 (effective CPC column), Tab 2 (SEO Score gauge if Map Pack target moved), Tab 1 (differentiator clarity score)
- Impact chip on Competitive Intensity: shows current Tab 3 keyword count + delta vs. snapshot
- Impact chip on Map Pack Target: shows current Local SEO category contribution to SEO Score

---

## 12. State Object Shape

```js
const state = {
  // Tier 3 globals
  globals: {
    monthlyBudget: 5000,
    targetRoas: 4.0,
    avgQualityScore: 6,
  },
  // Tier 2 drivers, by tab
  tabs: {
    website:    { conversionRate: 0.022, bounceRate: 0.58, mobileSpeed: 62 },
    seo:        { domainAuthority: 28, indexedQuality: 6.5, clusterCoverage: 0.40 },
    seoOpps:    { captureRateAtRank3: 0.25, difficultyTolerance: 6, pillarPaceMonths: 3 },
    ppcKw:      { cpcCeiling: 12, exactMatchPct: 0.40, negCoverage: 0.50 },
    ppcProj:    { avgCpc: 6.50, lpCr: 0.030, leadToCustomerCr: 0.18, avgDealSize: 8500, marginPct: 0.35 },
    plan:       { seoShare: 0.45, paidShare: 0.40, paceMultiplier: 1.0 },
    competitor: { intensity: 6, mapPackTarget: 1, differentiation: 5 },
  },
  // Tab 7 — competitor cards, scored on the 5 dimensions
  competitors: [
    { name: 'Competitor A', rating: 4.5, reviews: 230, da: 55, mapPos: 1,
      scores: { localSeo: 8, messaging: 7, design: 8, trust: 9, conversion: 8 } },
    // ...etc, 4–5 cards plus the prospect
  ],
  // Tier 1 per-metric scores+weights, one entry per row
  metrics: {
    'website.conv.value-prop':   { score: 5, weight: 9 },
    'website.conv.cta-visibility': { score: 4, weight: 9 },
    // ...etc, ~150 rows total
  },
  // Snapshot taken at load — for delta chip computation
  snapshot: { /* deep copy of above at load */ },
};
```

This is the entire mental model. Everything in the dashboard is derived from this object.
