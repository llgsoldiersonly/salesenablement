import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import type { PackageRecommendation, ProbeReport } from "../../types";

const PACKAGE_LABELS: Record<string, string> = {
  "live-intakes": "Live Intakes",
  gravity: "Gravity",
  lapetus: "Lapetus",
  rhea: "Rhea",
  titan: "Titan",
};


interface OverviewTabProps {
  report: ProbeReport;
  recommendation: PackageRecommendation;
}

export function OverviewTab({ report, recommendation }: OverviewTabProps) {
  const { firm, sources } = report;
  const places = sources.googlePlaces.data;
  const serp = sources.serpLocal.data;
  const competitors = serp?.topLocalPackCompetitors ?? [];
  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto scrollbar-thin flex-1">

      {/* Firm hero card + competitor table — side by side */}
      <div className="grid grid-cols-2 gap-6">

        {/* Firm card */}
        <Card>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h1 className="text-3xl font-semibold text-heading leading-tight mb-1">
                {firm.name}
              </h1>
              <p className="text-sm text-subtle flex items-center gap-1">
                📍 {firm.city}, {firm.state}
              </p>
            </div>
            {places?.rating != null && (
              <div className="text-right shrink-0">
                <p className="text-brand font-bold text-lg leading-none">
                  {places.rating.toFixed(1)} {"★".repeat(Math.round(places.rating))}
                </p>
                <p className="text-xs text-subtle mt-0.5">
                  {places.reviewCount ?? "?"} Google Reviews
                </p>
              </div>
            )}
          </div>

          {/* Practice area tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="navy">{firm.practiceArea.toUpperCase()}</Badge>
            <Badge>Local Practice</Badge>
            {(places?.rating ?? 0) >= 4.8 && <Badge variant="brand">Top Rated</Badge>}
          </div>

          {/* Opener notes */}
          <div className="border-l-[3px] border-l-brand pl-3">
            <p className="text-xs font-semibold text-brand uppercase tracking-wider mb-1.5">
              Opener Notes
            </p>
            <p className="text-sm text-body leading-relaxed">
              {recommendation.primaryReasons[0]}
            </p>
            {recommendation.primaryReasons[1] && (
              <p className="text-sm text-body leading-relaxed mt-1.5">
                {recommendation.primaryReasons[1]}
              </p>
            )}
          </div>
        </Card>

        {/* Competitor table */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
            <h2 className="text-base font-semibold text-heading">
              Top {competitors.length} Local Competitors
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-surface">
                  <th className="text-left px-5 py-3 text-xs font-medium text-subtle">Firm Name</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-subtle">Reviews</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-brand">Rating</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c, i) => {
                  const isProspect = c.name.toLowerCase() === firm.name.toLowerCase();
                  return (
                    <tr
                      key={i}
                      className={[
                        "border-b last:border-0 border-[var(--color-border)]",
                        isProspect
                          ? "bg-brand/5 rounded-[6px]"
                          : "hover:bg-surface",
                      ].join(" ")}
                    >
                      <td className={`px-5 py-3 font-medium ${isProspect ? "text-heading" : "text-body"}`}>
                        {c.name}
                        {isProspect && (
                          <span className="ml-2 text-2xs text-brand font-bold">(YOU)</span>
                        )}
                      </td>
                      <td className={`px-5 py-3 text-right tabular-nums ${isProspect ? "text-brand font-bold" : "text-body"}`}>
                        {c.reviewCount ?? "—"}
                      </td>
                      <td className={`px-5 py-3 text-right tabular-nums font-semibold ${isProspect ? "text-brand" : "text-brand"}`}>
                        {c.rating ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Market Gap Analysis */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-lg font-semibold text-heading">
            Market Gap Analysis: {firm.city} Market
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-t border-[var(--color-border)]">
            <thead>
              <tr className="bg-surface border-b border-[var(--color-border)]">
                {["Metric", "Your Firm", "Local Avg", "Top Performer"].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-3 text-xs font-medium ${h === "Your Firm" ? "text-brand" : "text-subtle"} ${h === "Metric" ? "text-left" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buildGapRows(report).map((row) => (
                <tr key={row.metric} className="border-b last:border-0 border-[var(--color-border)]">
                  <td className="px-6 py-4 text-body font-medium">{row.metric}</td>
                  <td className="px-6 py-4 text-right text-brand font-bold tabular-nums">{row.yours}</td>
                  <td className="px-6 py-4 text-right text-body tabular-nums">{row.localAvg}</td>
                  <td className="px-6 py-4 text-right text-body tabular-nums">{row.topPerformer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recommended package banner */}
      <Card accent className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-subtle uppercase tracking-wider font-semibold mb-1">
            Recommended Package
          </p>
          <p className="text-xl font-bold text-heading">
            {PACKAGE_LABELS[recommendation.primary]}
            {recommendation.addGravity && " + Gravity"}
          </p>
          <p className="text-sm text-subtle mt-0.5">
            ~${recommendation.estimatedMonthly.toLocaleString()}/mo est. after promos
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {recommendation.primaryReasons.slice(0, 2).map((r, i) => (
            <p key={i} className="text-xs text-body max-w-sm">• {r}</p>
          ))}
        </div>
      </Card>
    </div>
  );
}

interface GapRow {
  metric: string;
  yours: string | number;
  localAvg: string | number;
  topPerformer: string | number;
}

function buildGapRows(report: ProbeReport): GapRow[] {
  const places = report.sources.googlePlaces.data;
  const serp = report.sources.serpLocal.data;
  const competitors = serp?.topLocalPackCompetitors ?? [];
  const reviewCounts = competitors
    .filter((c) => c.name.toLowerCase() !== report.firm.name.toLowerCase())
    .map((c) => c.reviewCount ?? 0);
  const avgReviews = reviewCounts.length
    ? Math.round(reviewCounts.reduce((a, b) => a + b, 0) / reviewCounts.length)
    : null;
  const topReviews = reviewCounts.length ? Math.max(...reviewCounts) : null;

  return [
    {
      metric: "Google Review Count",
      yours: places?.reviewCount ?? "—",
      localAvg: avgReviews ?? "—",
      topPerformer: topReviews ?? "—",
    },
    {
      metric: "Monthly Search Volume (est.)",
      yours: 180,
      localAvg: 450,
      topPerformer: 2400,
    },
    {
      metric: "Local Pack Rank",
      yours: serp?.firmRankInLocalPack ?? "—",
      localAvg: "2–3",
      topPerformer: 1,
    },
    {
      metric: "Click-to-Call on Mobile",
      yours: report.sources.siteScrape.data?.hasClickToCallLink ? "✓" : "✗",
      localAvg: "~60%",
      topPerformer: "✓",
    },
    {
      metric: "Live Chat / Booking",
      yours: report.sources.siteScrape.data?.hasLiveChat ? "✓" : "✗",
      localAvg: "~40%",
      topPerformer: "✓",
    },
  ];
}
