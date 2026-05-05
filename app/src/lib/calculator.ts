/**
 * Calculator math — ports the Tier 2 + Tier 3 driver formulas from
 * slider-cascade-math.md into a single deterministic compute.
 *
 * Tier 1 (per-metric category roll-ups) lives in audits.ts when the
 * Audit tab gets built. Tier 3 globals here are Monthly Budget and
 * Target ROAS — Avg Quality Score is wired in once we add the PPC
 * Keyword tab.
 */

export interface CalcGlobals {
  /** Tier 3 — feeds every Tab 5 (Calculator) number. */
  monthlyBudget: number;
  /** Tier 3 — drives color bands on ROAS, Profit, CPA. */
  targetRoas: number;
}

export interface CalcDrivers {
  /** Tier 2 — feeds clicks. Falls when Quality Score rises (cross-tab cascade). */
  avgCpc: number;
  /** Adds to paid clicks before the LP CR funnel step. */
  monthlySiteVisitors: number;
  /** 0..1 — Landing Page Conversion Rate (visitors → leads). */
  lpConversionRate: number;
  /** 0..1 — Lead-to-Customer (signed case) rate. */
  leadToCustomerRate: number;
  /** Average revenue per signed case. */
  avgDealSize: number;
  /** 0..1 — gross margin used for profit calc. */
  marginPct: number;
}

export interface ScenarioInputs extends CalcGlobals, CalcDrivers {}

export interface ScenarioResult {
  scenario: ScenarioName;
  clicks: number;
  leads: number;
  customers: number;
  revenue: number;
  profit: number;
  roas: number;
  cpa: number;
}

export type ScenarioName = "conservative" | "realistic" | "aggressive";

/** Per slider-cascade-math.md §3.3 — "always-on" three-scenario fanning. */
export const SCENARIO_MULTIPLIERS: Record<ScenarioName, number> = {
  conservative: 0.75,
  realistic: 1.0,
  aggressive: 1.25,
};

export const SCENARIO_LABELS: Record<ScenarioName, string> = {
  conservative: "Conservative",
  realistic: "Realistic",
  aggressive: "Aggressive",
};

/**
 * Single-scenario PPC funnel compute.
 *
 * Per-metric formulas (slider-cascade-math.md §3.2):
 *   clicks    = monthly_budget / avg_cpc + monthly_site_visitors
 *   leads     = clicks × lp_conversion_rate
 *   customers = leads × lead_to_customer_rate
 *   revenue   = customers × avg_deal_size
 *   profit    = revenue × margin_pct − monthly_budget
 *   roas      = revenue / monthly_budget
 *   cpa       = monthly_budget / customers
 *
 * The scenario multiplier (§3.3) fans `leads` (which propagates to
 * customers/revenue/profit). It does NOT change clicks or CPC — those are
 * structural inputs, not "best guess" estimates.
 */
export function computeScenario(
  inputs: ScenarioInputs,
  scenario: ScenarioName
): ScenarioResult {
  const m = SCENARIO_MULTIPLIERS[scenario];
  const paidClicks = inputs.avgCpc > 0 ? inputs.monthlyBudget / inputs.avgCpc : 0;
  const totalClicks = paidClicks + inputs.monthlySiteVisitors;
  const leads = totalClicks * inputs.lpConversionRate * m;
  const customers = leads * inputs.leadToCustomerRate;
  const revenue = customers * inputs.avgDealSize;
  const profit = revenue * inputs.marginPct - inputs.monthlyBudget;
  const roas = inputs.monthlyBudget > 0 ? revenue / inputs.monthlyBudget : 0;
  const cpa = customers > 0 ? inputs.monthlyBudget / customers : 0;

  return {
    scenario,
    clicks: Math.round(totalClicks),
    leads: Math.round(leads),
    customers: Math.round(customers),
    revenue: Math.round(revenue),
    profit: Math.round(profit),
    roas,
    cpa: Math.round(cpa),
  };
}

export function computeAllScenarios(inputs: ScenarioInputs): ScenarioResult[] {
  return (Object.keys(SCENARIO_MULTIPLIERS) as ScenarioName[]).map((s) =>
    computeScenario(inputs, s)
  );
}

/* ── Color bands (slider-cascade-math.md §4.2) ──────────────────────────── */

export type Band = "green" | "amber" | "red";

export interface BandWithLabel {
  band: Band;
  label: "Profitable" | "Marginal" | "Unprofitable";
}

export function roasBand(actualRoas: number, targetRoas: number): BandWithLabel {
  if (actualRoas >= targetRoas) return { band: "green", label: "Profitable" };
  if (actualRoas >= targetRoas * 0.75) return { band: "amber", label: "Marginal" };
  return { band: "red", label: "Unprofitable" };
}

export function cpaTarget(avgDealSize: number, marginPct: number, targetRoas: number): number {
  return targetRoas > 0 ? (avgDealSize * marginPct) / targetRoas : 0;
}

export function cpaBand(actualCpa: number, target: number): BandWithLabel {
  if (target <= 0 || actualCpa <= 0) return { band: "amber", label: "Marginal" };
  if (actualCpa <= target) return { band: "green", label: "Profitable" };
  if (actualCpa <= target * 1.25) return { band: "amber", label: "Marginal" };
  return { band: "red", label: "Unprofitable" };
}

/* ── Threshold narratives (slider-cascade-math.md §8) ───────────────────── */

export interface ThresholdNarrative {
  id: string;
  text: string;
}

export function activeNarratives(
  inputs: ScenarioInputs,
  realistic: ScenarioResult
): ThresholdNarrative[] {
  const out: ThresholdNarrative[] = [];

  // 1. ROAS profitable scaling
  if (inputs.targetRoas >= 4.0 && realistic.roas >= inputs.targetRoas) {
    const ceiling = inputs.monthlyBudget * 4;
    out.push({
      id: "roas-scaling",
      text: `At ROAS ${inputs.targetRoas.toFixed(1)}x, scaling to $${ceiling.toLocaleString()}/mo is profitable at current funnel rates.`,
    });
  }

  // 3. LP CR breakeven
  // breakeven_cr is the CR at which profit == 0 at the current budget.
  // profit = budget/cpc × cr × ltc × deal × margin − budget = 0
  // → cr_breakeven = cpc / (ltc × deal × margin)
  const breakevenCr =
    inputs.avgCpc > 0 && inputs.leadToCustomerRate > 0 && inputs.avgDealSize > 0 && inputs.marginPct > 0
      ? inputs.avgCpc / (inputs.leadToCustomerRate * inputs.avgDealSize * inputs.marginPct)
      : null;
  if (breakevenCr != null && inputs.lpConversionRate >= breakevenCr) {
    out.push({
      id: "lp-cr-breakeven",
      text: `At LP CR ${(inputs.lpConversionRate * 100).toFixed(1)}%, paid breakeven is at $${Math.round(inputs.monthlyBudget * 0.6).toLocaleString()} spend — every dollar above that is profit.`,
    });
  }

  // 5. Budget threshold for AI tactics
  if (inputs.monthlyBudget >= 10000) {
    out.push({
      id: "budget-ai",
      text: `Above $10K/mo, programmatic landing pages compound — phase 60–90.`,
    });
  }

  return out;
}
