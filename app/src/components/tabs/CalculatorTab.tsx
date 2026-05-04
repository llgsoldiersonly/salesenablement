import { useMemo, useState } from "react";
import { Card } from "../ui/Card";
import {
  activeNarratives,
  computeAllScenarios,
  cpaBand,
  cpaTarget,
  roasBand,
  SCENARIO_LABELS,
  type Band,
  type ScenarioInputs,
  type ScenarioName,
} from "../../lib/calculator";
import type { FirmInput } from "../../types";

const BAND_TEXT_CLASS: Record<Band, string> = {
  green: "text-[var(--color-success)]",
  amber: "text-[var(--color-warning)]",
  red:   "text-[var(--color-danger)]",
};

const BAND_TEXT_CLASS_INVERTED: Record<Band, string> = {
  green: "text-emerald-300",
  amber: "text-amber-300",
  red:   "text-red-300",
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  helper?: string;
}

function Slider({ label, value, min, max, step, format, onChange, helper }: SliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-body">{label}</label>
        <span className="text-sm font-semibold text-heading shadow-inset rounded-[6px] bg-surface px-3 py-1 tabular-nums min-w-[88px] text-center">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full bg-surface shadow-inset appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-heading
                   [&::-webkit-slider-thumb]:shadow-sm
                   [&::-webkit-slider-thumb]:cursor-grab"
      />
      <div className="flex justify-between text-2xs text-subtle">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
      {helper && <p className="text-2xs text-subtle italic">{helper}</p>}
    </div>
  );
}

interface CalculatorTabProps {
  firm: FirmInput;
}

const DEFAULT_DEAL_SIZE_BY_PRACTICE: Record<string, number> = {
  "personal injury":   45000,
  "medical malpractice": 250000,
  "mass tort":         150000,
  "criminal defense":  12000,
  "immigration":        4500,
  "estate planning":    3500,
  "family law":         8500,
  "bankruptcy":         2500,
};

export function CalculatorTab({ firm }: CalculatorTabProps) {
  const defaultDealSize =
    DEFAULT_DEAL_SIZE_BY_PRACTICE[firm.practiceArea.toLowerCase()] ?? 12000;

  const [inputs, setInputs] = useState<ScenarioInputs>({
    monthlyBudget: 12500,
    targetRoas: 4.0,
    avgCpc: 42.5,
    monthlySiteVisitors: 2450,
    lpConversionRate: 0.042,
    leadToCustomerRate: 0.18,
    avgDealSize: defaultDealSize,
    marginPct: 0.35,
  });

  const set = <K extends keyof ScenarioInputs>(key: K) => (v: number) =>
    setInputs((prev) => ({ ...prev, [key]: v }));

  const scenarios = useMemo(() => computeAllScenarios(inputs), [inputs]);
  const realistic = scenarios.find((s) => s.scenario === "realistic")!;
  const target = cpaTarget(inputs.avgDealSize, inputs.marginPct, inputs.targetRoas);
  const narratives = useMemo(
    () => activeNarratives(inputs, realistic),
    [inputs, realistic]
  );

  const currentCases = Math.max(1, Math.round(realistic.customers * 0.22));
  const maxCapacity  = Math.round(realistic.customers * 1.6);

  return (
    <div className="flex flex-col gap-5 p-6 overflow-y-auto scrollbar-thin flex-1">
      <div>
        <h2 className="text-2xl font-semibold text-heading">Case Growth Calculator</h2>
        <p className="text-sm text-subtle mt-0.5">
          {firm.name} — {firm.city}, {firm.state.slice(0, 2).toUpperCase()}
        </p>
      </div>

      {/* Threshold narratives — fade in when crossed */}
      {narratives.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {narratives.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-surface shadow-sm border border-[var(--color-border)] animate-[fadeIn_200ms_ease-out]"
            >
              <span className="text-brand text-sm">★</span>
              <p className="text-xs text-body">{n.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[340px_1fr] gap-6">

        {/* Left: Globals + Drivers */}
        <div className="flex flex-col gap-5">

          {/* Tier 3 Globals */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-heading flex items-center gap-2">
                <span className="text-brand">●</span> Globals
              </h3>
              <span className="text-2xs text-subtle uppercase tracking-wider">Tier 3</span>
            </div>
            <div className="flex flex-col gap-5">
              <Slider
                label="Monthly Ad Budget"
                value={inputs.monthlyBudget}
                min={1000} max={100000} step={500}
                format={(v) => `$${v.toLocaleString()}`}
                onChange={set("monthlyBudget")}
              />
              <Slider
                label="Target ROAS"
                value={inputs.targetRoas}
                min={1.0} max={10.0} step={0.1}
                format={(v) => `${v.toFixed(1)}x`}
                onChange={set("targetRoas")}
                helper={`CPA target at this ROAS: $${Math.round(target).toLocaleString()}`}
              />
            </div>
          </Card>

          {/* Tier 2 Drivers */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-heading flex items-center gap-2">
                <span className="text-secondary opacity-50">◆</span> Funnel Drivers
              </h3>
              <span className="text-2xs text-subtle uppercase tracking-wider">Tier 2</span>
            </div>
            <div className="flex flex-col gap-5">
              <Slider
                label={`Avg CPC (${firm.practiceArea})`}
                value={inputs.avgCpc}
                min={5} max={200} step={0.5}
                format={(v) => `$${v.toFixed(2)}`}
                onChange={set("avgCpc")}
              />
              <Slider
                label="Monthly Site Visitors (organic)"
                value={inputs.monthlySiteVisitors}
                min={0} max={20000} step={50}
                format={(v) => v.toLocaleString()}
                onChange={set("monthlySiteVisitors")}
              />
              <Slider
                label="LP Conversion Rate"
                value={inputs.lpConversionRate}
                min={0.005} max={0.15} step={0.001}
                format={(v) => `${(v * 100).toFixed(1)}%`}
                onChange={set("lpConversionRate")}
                helper="Visitors → Leads (form fills, calls)"
              />
              <Slider
                label="Lead → Customer Rate"
                value={inputs.leadToCustomerRate}
                min={0.05} max={0.6} step={0.01}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={set("leadToCustomerRate")}
                helper="Leads that sign as a case"
              />
              <Slider
                label="Avg Case Value"
                value={inputs.avgDealSize}
                min={1000} max={500000} step={500}
                format={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                onChange={set("avgDealSize")}
              />
              <Slider
                label="Gross Margin %"
                value={inputs.marginPct}
                min={0.1} max={0.9} step={0.01}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={set("marginPct")}
              />
            </div>
          </Card>

          <Card className="flex gap-3 items-start">
            <span className="text-brand mt-0.5 shrink-0">ⓘ</span>
            <p className="text-xs text-subtle italic leading-relaxed">
              Defaults seeded from {firm.practiceArea} averages. Adjust to match
              the firm's historical close-rate before pitching the package tier.
            </p>
          </Card>
        </div>

        {/* Right: Scenarios + Capacity */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {scenarios.map((s) => {
              const isTarget = s.scenario === "realistic";
              const rb = roasBand(s.roas, inputs.targetRoas);
              const cb = cpaBand(s.cpa, target);
              const bandClass = (b: Band) => isTarget ? BAND_TEXT_CLASS_INVERTED[b] : BAND_TEXT_CLASS[b];

              return (
                <Card
                  key={s.scenario}
                  dark={isTarget}
                  className={isTarget ? "ring-2 ring-brand/40" : ""}
                >
                  {isTarget && (
                    <p className="text-xs font-bold text-brand uppercase tracking-widest mb-1">
                      Target
                    </p>
                  )}
                  <p className={`text-xs font-medium mb-2 ${isTarget ? "text-white/70" : "text-subtle"}`}>
                    {SCENARIO_LABELS[s.scenario as ScenarioName]}
                  </p>
                  <p className={`text-4xl font-bold tabular-nums leading-none mb-3 ${isTarget ? "text-white" : "text-heading"}`}>
                    ${formatCompact(s.revenue)}
                  </p>
                  <p className={`text-2xs uppercase tracking-wider mb-3 ${isTarget ? "text-white/50" : "text-subtle"}`}>
                    Est. Monthly Revenue
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold ${isTarget ? "text-white/70" : "text-subtle"}`}>CASES</span>
                    <span className={`text-sm font-bold tabular-nums ${isTarget ? "text-white" : "text-heading"}`}>
                      {s.customers}
                    </span>
                    <div className={`h-0.5 flex-1 rounded-full ${isTarget ? "bg-brand" : "bg-[var(--color-border-strong)]"}`} />
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs">
                    <Row label="Profit"  inverted={isTarget}>
                      <span className={`font-semibold tabular-nums ${bandClass(rb.band)}`}>
                        ${formatCompact(s.profit)}
                      </span>
                    </Row>
                    <Row label="ROAS"    inverted={isTarget}>
                      <span className={`font-bold tabular-nums ${bandClass(rb.band)}`}>
                        {s.roas.toFixed(1)}x
                      </span>
                    </Row>
                    <Row label="CPA"     inverted={isTarget}>
                      <span className={`font-semibold tabular-nums ${bandClass(cb.band)}`}>
                        ${s.cpa.toLocaleString()}
                      </span>
                    </Row>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Capacity utilization */}
          <Card>
            <h3 className="text-sm font-semibold text-heading mb-5">
              Capacity Utilization &amp; Growth Curve
            </h3>
            <div className="flex items-end justify-around py-4">
              {[
                { label: "Current",      value: currentCases,        accent: false },
                { label: "Realistic",    value: realistic.customers, accent: false },
                { label: "Max Capacity", value: maxCapacity,         accent: true },
              ].map((bar) => (
                <div key={bar.label} className="flex flex-col items-center gap-2">
                  <span className={`text-3xl font-bold tabular-nums ${bar.accent ? "text-brand" : "text-heading"}`}>
                    {bar.value}
                  </span>
                  <span className={`text-2xs uppercase tracking-widest font-semibold ${bar.accent ? "text-brand" : "text-subtle"}`}>
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-4 mt-2">
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">🚀</span>
                <div>
                  <p className="text-xs font-semibold text-heading">Scale Potential</p>
                  <p className="text-xs text-subtle mt-0.5">
                    Engine supports up to {Math.round((maxCapacity / currentCases) * 100)}% of
                    current case volume with existing staff.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">🔥</span>
                <div>
                  <p className="text-xs font-semibold text-heading">Burn Rate Safety</p>
                  <p className="text-xs text-subtle mt-0.5">
                    Recommended ${Math.round((inputs.monthlyBudget * 1.2) / 1000)}k ceiling
                    to maintain CPA below ${Math.round(target * 1.25).toLocaleString()}.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children, inverted }: { label: string; children: React.ReactNode; inverted?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`${inverted ? "text-white/60" : "text-subtle"}`}>{label}</span>
      {children}
    </div>
  );
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return `${sign}${abs}`;
}
