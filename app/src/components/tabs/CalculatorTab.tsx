import { useState } from "react";
import { Card } from "../ui/Card";
import type { FirmInput } from "../../types";

interface CalcInputs {
  monthlyAdSpend: number;
  avgCpc: number;
  monthlySiteVisitors: number;
  leadConversionPct: number;
  caseSignedPct: number;
}

interface Scenario {
  label: string;
  multiplier: number;
  isTarget?: boolean;
}

const SCENARIOS: Scenario[] = [
  { label: "Conservative", multiplier: 0.65 },
  { label: "Realistic",    multiplier: 1.0, isTarget: true },
  { label: "Aggressive",   multiplier: 1.58 },
];

const AVG_CASE_VALUE = 12000; /* criminal defense average — adjustable later */

function compute(inputs: CalcInputs, multiplier: number) {
  const clicks = inputs.monthlyAdSpend / inputs.avgCpc;
  const leads  = (inputs.monthlySiteVisitors + clicks) * (inputs.leadConversionPct / 100);
  const cases  = leads * (inputs.caseSignedPct / 100) * multiplier;
  const revenue = cases * AVG_CASE_VALUE;
  const cac    = cases > 0 ? inputs.monthlyAdSpend / cases : 0;
  const roi    = inputs.monthlyAdSpend > 0 ? revenue / inputs.monthlyAdSpend : 0;
  return { cases: Math.round(cases), revenue: Math.round(revenue), cac: Math.round(cac), roi };
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, format, onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-body">{label}</label>
        <span className="text-sm font-semibold text-heading shadow-inset rounded-[6px] bg-surface px-3 py-1 tabular-nums">
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
    </div>
  );
}

interface CalculatorTabProps {
  firm: FirmInput;
}

export function CalculatorTab({ firm }: CalculatorTabProps) {
  const [inputs, setInputs] = useState<CalcInputs>({
    monthlyAdSpend: 12500,
    avgCpc: 42.5,
    monthlySiteVisitors: 2450,
    leadConversionPct: 4.2,
    caseSignedPct: 18,
  });

  const set = (key: keyof CalcInputs) => (v: number) =>
    setInputs((prev) => ({ ...prev, [key]: v }));

  const scenarios = SCENARIOS.map((s) => ({ ...s, ...compute(inputs, s.multiplier) }));
  const realistic = scenarios.find((s) => s.isTarget)!;
  const currentCases = Math.max(1, Math.round(realistic.cases * 0.22));
  const maxCapacity  = Math.round(realistic.cases * 1.6);

  return (
    <div className="flex flex-col gap-5 p-6 overflow-y-auto scrollbar-thin flex-1">
      <div>
        <h2 className="text-2xl font-semibold text-heading">Case Growth Calculator</h2>
        <p className="text-sm text-subtle mt-0.5">
          {firm.name} — {firm.city}, {firm.state.slice(0, 2).toUpperCase()}
        </p>
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-6">

        {/* Inputs */}
        <div className="flex flex-col gap-5">
          <Card>
            <h3 className="text-sm font-semibold text-heading flex items-center gap-2 mb-5">
              <span className="text-subtle">⚙</span> Growth Variables
            </h3>
            <div className="flex flex-col gap-6">
              <Slider label="Monthly Ad Spend" value={inputs.monthlyAdSpend} min={1000} max={50000} step={500}
                format={(v) => `$ ${v.toLocaleString()}`} onChange={set("monthlyAdSpend")} />
              <Slider label={`Avg CPC (${firm.practiceArea})`} value={inputs.avgCpc} min={10} max={150} step={0.5}
                format={(v) => `$ ${v.toFixed(2)}`} onChange={set("avgCpc")} />
              <Slider label="Monthly Site Visitors" value={inputs.monthlySiteVisitors} min={100} max={20000} step={50}
                format={(v) => v.toLocaleString()} onChange={set("monthlySiteVisitors")} />
              <Slider label="Lead Conversion %" value={inputs.leadConversionPct} min={0.5} max={15} step={0.1}
                format={(v) => `${v.toFixed(1)} %`} onChange={set("leadConversionPct")} />
              <Slider label="Case Signed % (of Leads)" value={inputs.caseSignedPct} min={5} max={60} step={1}
                format={(v) => `${v} %`} onChange={set("caseSignedPct")} />
            </div>
          </Card>

          {/* Note card */}
          <Card className="flex gap-3 items-start">
            <span className="text-brand mt-0.5 shrink-0">ⓘ</span>
            <p className="text-xs text-subtle italic leading-relaxed">
              Note: CPC reflects current {firm.city} market volatility for {firm.practiceArea}.
              {firm.name} historical lead conversion sits at 3.8% (Target: 5.5%).
            </p>
          </Card>
        </div>

        {/* Scenarios */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {scenarios.map((s) => (
              <Card
                key={s.label}
                dark={s.isTarget}
                className={s.isTarget ? "ring-2 ring-brand/40" : ""}
              >
                {s.isTarget && (
                  <p className="text-xs font-bold text-brand uppercase tracking-widest mb-1">Target</p>
                )}
                <p className={`text-xs font-medium mb-2 ${s.isTarget ? "text-white/70" : "text-subtle"}`}>
                  {s.label}
                </p>
                <p className={`text-4xl font-bold tabular-nums leading-none mb-3 ${s.isTarget ? "text-white" : "text-heading"}`}>
                  ${s.revenue >= 1000 ? `${Math.round(s.revenue / 1000)}k` : s.revenue}
                </p>
                <p className={`text-2xs uppercase tracking-wider mb-3 ${s.isTarget ? "text-white/50" : "text-subtle"}`}>
                  Est. Monthly Revenue
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold ${s.isTarget ? "text-white/70" : "text-subtle"}`}>CASES</span>
                  <span className={`text-sm font-bold tabular-nums ${s.isTarget ? "text-white" : "text-heading"}`}>{s.cases}</span>
                  <div className={`h-0.5 flex-1 rounded-full ${s.isTarget ? "bg-brand" : "bg-[var(--color-border-strong)]"}`} />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className={`text-xs ${s.isTarget ? "text-white/60" : "text-subtle"}`}>CAC</span>
                    <span className={`text-xs font-semibold tabular-nums ${s.isTarget ? "text-white" : "text-body"}`}>
                      ${s.cac.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${s.isTarget ? "text-white/60" : "text-subtle"}`}>ROI</span>
                    <span className={`text-xs font-bold tabular-nums ${s.isTarget ? "text-brand" : "text-brand"}`}>
                      {s.roi.toFixed(1)}x
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Capacity utilization */}
          <Card>
            <h3 className="text-sm font-semibold text-heading mb-5">
              Capacity Utilization &amp; Growth Curve
            </h3>
            <div className="flex items-end justify-around py-4">
              {[
                { label: "Current",  value: currentCases, accent: false },
                { label: "Realistic", value: realistic.cases, accent: false },
                { label: "Max Capacity", value: maxCapacity, accent: true },
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
                    Current engine supports up to 350% increase with existing staff.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">🔥</span>
                <div>
                  <p className="text-xs font-semibold text-heading">Burn Rate Safety</p>
                  <p className="text-xs text-subtle mt-0.5">
                    Recommended ${Math.round(inputs.monthlyAdSpend * 1.2 / 1000)}k ceiling to maintain CAC below $800.
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
