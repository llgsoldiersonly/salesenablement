import { useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { ScoreRing } from "../ui/ScoreRing";
import { buildAudit } from "../../lib/audit";
import type { AuditCategory, AuditMetric } from "../../lib/audit";
import type { ProbeReport } from "../../types";

interface IntakeTabProps {
  report: ProbeReport;
}

export function IntakeTab({ report }: IntakeTabProps) {
  const audit = useMemo(() => buildAudit(report), [report]);
  const [expanded, setExpanded] = useState<string>("intake");

  const failingCount = audit.categories.flatMap((c) => c.metrics).filter((m) => m.tip !== null).length;
  const passingCount = audit.categories.flatMap((c) => c.metrics).filter((m) => m.tip === null).length;

  const gradeColor =
    audit.overallScore >= 80
      ? "text-[var(--color-success)]"
      : audit.overallScore >= 60
        ? "text-brand"
        : audit.overallScore >= 40
          ? "text-[var(--color-warning)]"
          : "text-[var(--color-danger)]";

  const activeCategory = audit.categories.find((c) => c.id === expanded) ?? null;

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto scrollbar-thin flex-1">

      {/* Hero score row */}
      <div className="flex items-center gap-6">
        <ScoreRing score={audit.overallScore} size={96} strokeWidth={8} />
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold leading-none ${gradeColor}`}>
              {audit.overallScore}
            </span>
            <span className="text-lg text-subtle font-medium">/ 100</span>
            <span className={`ml-2 text-2xl font-bold ${gradeColor}`}>
              Grade {audit.grade}
            </span>
          </div>
          <p className="text-sm text-body mt-1">
            Digital Health Score — {report.firm.name}
          </p>
          <div className="flex gap-4 mt-2">
            <span className="text-xs text-[var(--color-danger)] font-semibold">
              {failingCount} issue{failingCount !== 1 ? "s" : ""} found
            </span>
            <span className="text-xs text-[var(--color-success)] font-semibold">
              {passingCount} checks passing
            </span>
          </div>
        </div>

        {/* Priority action banner */}
        {failingCount > 0 && (
          <div className="border-l-[3px] border-l-brand pl-4 max-w-xs">
            <p className="text-xs font-semibold text-brand uppercase tracking-wider mb-1">
              Top Priority
            </p>
            <p className="text-sm text-body leading-snug">
              {audit.categories
                .flatMap((c) => c.metrics)
                .filter((m) => m.tip !== null)
                .sort((a, b) => b.weight - a.weight)[0]?.tip ?? "—"}
            </p>
          </div>
        )}
      </div>

      {/* Category selector row */}
      <div className="grid grid-cols-5 gap-3">
        {audit.categories.map((cat) => (
          <CategoryButton
            key={cat.id}
            category={cat}
            isActive={expanded === cat.id}
            onClick={() => setExpanded(cat.id === expanded ? "" : cat.id)}
          />
        ))}
      </div>

      {/* Expanded detail panel */}
      {activeCategory && (
        <MetricPanel category={activeCategory} />
      )}

      {/* Full issues list */}
      {failingCount > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-heading">
              All Issues ({failingCount})
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {audit.categories
              .flatMap((c) =>
                c.metrics
                  .filter((m) => m.tip !== null)
                  .map((m) => ({ ...m, categoryLabel: c.label, categoryIcon: c.icon })),
              )
              .sort((a, b) => b.weight - a.weight)
              .map((m) => (
                <IssueRow key={m.id} metric={m} categoryLabel={m.categoryLabel} categoryIcon={m.categoryIcon} />
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function CategoryButton({
  category,
  isActive,
  onClick,
}: {
  category: AuditCategory;
  isActive: boolean;
  onClick: () => void;
}) {
  const issueCount = category.metrics.filter((m) => m.tip !== null).length;
  return (
    <button
      onClick={onClick}
      className={[
        "flex flex-col items-center gap-2 p-3 rounded-[10px] border transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        isActive
          ? "border-brand bg-brand/5 shadow-sm"
          : "border-[var(--color-border)] bg-surface shadow-sm hover:shadow-md",
      ].join(" ")}
    >
      <ScoreRing score={category.score} size={52} strokeWidth={5} />
      <span className="text-2xs font-semibold text-center text-body leading-tight">
        {category.icon} {category.label}
      </span>
      {issueCount > 0 && (
        <span className="text-2xs text-[var(--color-danger)] font-bold">
          {issueCount} issue{issueCount > 1 ? "s" : ""}
        </span>
      )}
    </button>
  );
}

function MetricPanel({ category }: { category: AuditCategory }) {
  const issues = category.metrics.filter((m) => m.tip !== null);
  const passing = category.metrics.filter((m) => m.tip === null);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)] flex items-center gap-4">
        <ScoreRing score={category.score} size={44} strokeWidth={4} />
        <div>
          <h3 className="text-base font-semibold text-heading">
            {category.icon} {category.label}
          </h3>
          <p className="text-xs text-subtle mt-0.5">
            {issues.length} issue{issues.length !== 1 ? "s" : ""} · {passing.length} passing
          </p>
        </div>
      </div>

      {/* Issues first */}
      {issues.length > 0 && (
        <div className="divide-y divide-[var(--color-border)]">
          {issues.map((m) => (
            <MetricRow key={m.id} metric={m} />
          ))}
        </div>
      )}

      {/* Passing (collapsed by default) */}
      {passing.length > 0 && (
        <>
          {issues.length > 0 && <div className="border-t border-[var(--color-border)]" />}
          <div className="divide-y divide-[var(--color-border)] opacity-70">
            {passing.map((m) => (
              <MetricRow key={m.id} metric={m} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function MetricRow({ metric }: { metric: AuditMetric }) {
  const isPass = metric.tip === null;
  return (
    <div className={`px-5 py-4 ${isPass ? "" : "bg-[var(--color-danger)]/[0.02]"}`}>
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold leading-none ${isPass ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}
          >
            {isPass ? "✓" : "✗"}
          </span>
          <span className="text-sm text-body font-medium">{metric.label}</span>
        </div>
        <span className="text-xs text-subtle shrink-0 font-mono">{metric.value}</span>
      </div>

      {/* Score bar */}
      <div className="h-1 w-full bg-[var(--color-border)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${metric.score}%`,
            backgroundColor:
              metric.score >= 80
                ? "var(--color-success)"
                : metric.score >= 60
                  ? "var(--color-brand)"
                  : metric.score >= 40
                    ? "var(--color-warning)"
                    : "var(--color-danger)",
            transition: "width 500ms ease-out",
          }}
        />
      </div>

      {metric.tip && (
        <p className="text-xs text-body mt-2 leading-relaxed">
          <span className="text-brand font-bold">→ </span>
          {metric.tip}
        </p>
      )}
    </div>
  );
}

function IssueRow({
  metric,
  categoryLabel,
  categoryIcon,
}: {
  metric: AuditMetric;
  categoryLabel: string;
  categoryIcon: string;
}) {
  return (
    <div className="px-5 py-3 flex items-start gap-3">
      <span className="text-[var(--color-danger)] font-bold text-sm mt-0.5 shrink-0">✗</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-body font-medium">{metric.label}</span>
          <span className="text-2xs text-subtle bg-surface border border-[var(--color-border)] px-1.5 py-0.5 rounded-full">
            {categoryIcon} {categoryLabel}
          </span>
        </div>
        <p className="text-xs text-body mt-0.5 leading-snug">
          <span className="text-brand font-semibold">→ </span>
          {metric.tip}
        </p>
      </div>
      <span className="text-xs font-mono text-subtle shrink-0">{metric.value}</span>
    </div>
  );
}
