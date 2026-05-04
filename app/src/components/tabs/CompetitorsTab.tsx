import { useMemo } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import type { ProbeReport, SerpCompetitor } from "../../types";

interface CompetitorsTabProps {
  report: ProbeReport;
}

interface ScoredCompetitor {
  data: SerpCompetitor;
  isProspect: boolean;
  reviewScore: number;   // 0–100
  ratingScore: number;   // 0–100
  positionScore: number; // 0–100
  overallScore: number;  // weighted composite
  threat: "high" | "medium" | "low";
  battlecard: Battlecard;
}

interface Battlecard {
  headline: string;
  strengths: string[];  // their strengths to be aware of
  angles: string[];     // how to position against them
}

function scoreCompetitors(report: ProbeReport): ScoredCompetitor[] {
  const serp = report.sources.serpLocal.data;
  const places = report.sources.googlePlaces.data;
  const competitors = serp?.topLocalPackCompetitors ?? [];
  if (competitors.length === 0) return [];

  const prospectName = report.firm.name.toLowerCase();
  const prospectReviews = places?.reviewCount ?? null;
  const prospectRating = places?.rating ?? null;

  const maxReviews = Math.max(
    ...competitors.map((c) => c.reviewCount ?? 0),
    prospectReviews ?? 0,
    1,
  );

  return competitors.map((c): ScoredCompetitor => {
    const isProspect = c.name.toLowerCase() === prospectName;

    const reviewScore = maxReviews > 0 ? Math.round(((c.reviewCount ?? 0) / maxReviews) * 100) : 0;

    const ratingScore = !c.rating
      ? 0
      : c.rating >= 4.9
        ? 100
        : c.rating >= 4.7
          ? 85
          : c.rating >= 4.5
            ? 70
            : c.rating >= 4.0
              ? 55
              : 30;

    const positionScore =
      c.rank == null
        ? 0
        : c.rank === 1
          ? 100
          : c.rank === 2
            ? 75
            : c.rank === 3
              ? 50
              : 25;

    const overallScore = Math.round(reviewScore * 0.4 + ratingScore * 0.35 + positionScore * 0.25);

    const threat: ScoredCompetitor["threat"] =
      isProspect
        ? "low"
        : overallScore >= 70
          ? "high"
          : overallScore >= 45
            ? "medium"
            : "low";

    const battlecard = buildBattlecard(c, prospectName, prospectReviews, prospectRating, report);

    return {
      data: c,
      isProspect,
      reviewScore,
      ratingScore,
      positionScore,
      overallScore,
      threat,
      battlecard,
    };
  });
}

function buildBattlecard(
  c: SerpCompetitor,
  _prospectName: string,
  prospectReviews: number | null,
  prospectRating: number | null,
  report: ProbeReport,
): Battlecard {
  const reviewDelta = (c.reviewCount ?? 0) - (prospectReviews ?? 0);
  const theirRating = c.rating ?? 0;
  const ourRating = prospectRating ?? 0;
  const city = report.firm.city;

  const strengths: string[] = [];
  const angles: string[] = [];

  // Review count analysis
  if (reviewDelta > 150) {
    strengths.push(`Dominant review moat: ${c.reviewCount} reviews vs. your ${prospectReviews ?? "0"}`);
    angles.push(
      "Lead with quality, not volume — your 5-star reviews are from real clients who chose you. Ask: 'Would you rather have 200 reviews or 200 happy clients?'",
    );
    angles.push(
      `Our Gravity platform systematically generates review velocity. In 90 days we can close this gap with authentic post-case review requests.`,
    );
  } else if (reviewDelta > 40) {
    strengths.push(`${reviewDelta} more Google reviews (${c.reviewCount} vs. ${prospectReviews ?? 0})`);
    angles.push(
      `Their review lead is bridgeable — we've seen firms in ${city} close gaps like this in 60–90 days with a systematic review ask program.`,
    );
  } else if (reviewDelta <= 0) {
    angles.push(
      `You match or outpace ${c.name} on review count. Lean into this: "We've already earned the trust of the community."`,
    );
  } else {
    strengths.push(`Modest review lead (${reviewDelta} more reviews)`);
    angles.push(`Only ${reviewDelta} reviews behind — a targeted ask campaign closes this within 30–45 days.`);
  }

  // Rating analysis
  if (theirRating > ourRating + 0.2) {
    strengths.push(`Higher Google rating (${theirRating.toFixed(1)} vs. yours ${ourRating > 0 ? ourRating.toFixed(1) : "N/A"})`);
    angles.push(
      "Higher rating with fewer reviews is actually a sign they're newer or less active. Our review program improves rating alongside volume.",
    );
  } else if (ourRating > theirRating + 0.1 && ourRating > 0) {
    angles.push(
      `You outrate ${c.name} (${ourRating.toFixed(1)} vs. ${theirRating > 0 ? theirRating.toFixed(1) : "N/A"}). Highlight: "Our clients are more satisfied — and they've said so publicly."`,
    );
  }

  // Local pack position
  if (c.rank === 1) {
    strengths.push(`Ranked #1 in the local pack — capturing the most clicks`);
    angles.push(
      `#1 is where we put you. Their rank is earned via review velocity + GBP optimization — both core to our Rhea/Titan packages.`,
    );
  }

  // Website signal
  if (!c.website) {
    angles.push(
      `${c.name} has no website listed on their GBP — a significant weakness you can exploit with a strong site and content strategy.`,
    );
  }

  // Generic angles if not enough
  if (angles.length < 2) {
    angles.push(
      `Focus on personal service — boutique vs. volume. ${c.name} likely spreads attention across many clients. Your clients get you.`,
    );
  }

  const headline =
    reviewDelta > 100
      ? `${c.name} is the review leader — focus on quality-over-quantity and review velocity`
      : reviewDelta <= 0
        ? `You have competitive standing vs. ${c.name} — time to push to #1`
        : `${c.name} has a manageable lead — closeable in 60–90 days`;

  return { headline, strengths, angles };
}

function threatBadge(threat: ScoredCompetitor["threat"]) {
  if (threat === "high") return <Badge variant="brand">High Threat</Badge>;
  if (threat === "medium") return <Badge variant="navy">Medium</Badge>;
  return <Badge>Low</Badge>;
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80
      ? "var(--color-success)"
      : score >= 60
        ? "var(--color-brand)"
        : score >= 40
          ? "var(--color-warning)"
          : "var(--color-danger)";
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-2xs text-subtle">{label}</span>
        <span className="text-2xs font-bold" style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 w-full bg-[var(--color-border)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: color, transition: "width 500ms ease-out" }}
        />
      </div>
    </div>
  );
}

export function CompetitorsTab({ report }: CompetitorsTabProps) {
  const scored = useMemo(() => scoreCompetitors(report), [report]);

  if (scored.length === 0) {
    return (
      <div className="flex flex-col gap-5 p-6 overflow-y-auto scrollbar-thin flex-1">
        <h2 className="text-2xl font-semibold text-heading">Competitor Intelligence</h2>
        <Card className="text-center py-12">
          <p className="text-subtle text-sm">No local competitor data available for this report.</p>
          <p className="text-subtle text-xs mt-1">Run a new probe to pull SerpAPI local pack data.</p>
        </Card>
      </div>
    );
  }

  const threats = scored.filter((s) => !s.isProspect && s.threat === "high");
  const prospect = scored.find((s) => s.isProspect);
  const competitors = scored.filter((s) => !s.isProspect);

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto scrollbar-thin flex-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-heading">Competitor Intelligence</h2>
          <p className="text-sm text-subtle mt-0.5">
            {report.firm.city} {report.firm.practiceArea} market · {competitors.length} competitor
            {competitors.length !== 1 ? "s" : ""} in local pack
            {threats.length > 0 && ` · ${threats.length} high-threat`}
          </p>
        </div>
        {prospect && (
          <div className="text-right shrink-0">
            <p className="text-xs text-subtle uppercase tracking-wider font-semibold mb-0.5">
              Your Position
            </p>
            <p className="text-2xl font-bold text-brand">
              #{prospect.data.rank ?? "—"}
            </p>
            <p className="text-xs text-subtle">in local pack</p>
          </div>
        )}
      </div>

      {/* Summary grid */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-heading">Market Scorecard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-surface">
                <th className="text-left px-5 py-3 text-xs font-medium text-subtle">Firm</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-subtle">Rank</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-subtle">Reviews</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-subtle">Rating</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-brand">Score</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-subtle">Threat</th>
              </tr>
            </thead>
            <tbody>
              {scored
                .slice()
                .sort((a, b) => b.overallScore - a.overallScore)
                .map((s, i) => (
                  <tr
                    key={i}
                    className={[
                      "border-b last:border-0 border-[var(--color-border)]",
                      s.isProspect ? "bg-brand/5" : "hover:bg-surface",
                    ].join(" ")}
                  >
                    <td className="px-5 py-3 font-medium text-body">
                      {s.data.name}
                      {s.isProspect && (
                        <span className="ml-2 text-2xs text-brand font-bold">(YOU)</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-body">
                      {s.data.rank != null ? `#${s.data.rank}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-body">
                      {s.data.reviewCount ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-body">
                      {s.data.rating != null ? s.data.rating.toFixed(1) : "—"}
                    </td>
                    <td
                      className="px-5 py-3 text-right tabular-nums font-bold"
                      style={{
                        color:
                          s.overallScore >= 70
                            ? "var(--color-danger)"
                            : s.overallScore >= 45
                              ? "var(--color-warning)"
                              : "var(--color-success)",
                      }}
                    >
                      {s.isProspect ? (
                        <span className="text-brand">{s.overallScore}</span>
                      ) : (
                        s.overallScore
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!s.isProspect && threatBadge(s.threat)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Battlecards */}
      <h3 className="text-lg font-semibold text-heading -mb-3">
        Competitor Battlecards
      </h3>

      <div className="grid grid-cols-1 gap-5">
        {competitors
          .sort((a, b) => b.overallScore - a.overallScore)
          .map((s, i) => (
            <BattlecardPanel key={i} scored={s} />
          ))}
      </div>

      {/* Market context */}
      <MarketContext report={report} scored={scored} />
    </div>
  );
}

function BattlecardPanel({
  scored,
}: {
  scored: ScoredCompetitor;
}) {
  const { data: c, battlecard, threat } = scored;

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header */}
      <div
        className={[
          "px-5 pt-4 pb-3 border-b border-[var(--color-border)] flex items-start justify-between gap-3",
          threat === "high" ? "bg-[var(--color-danger)]/[0.03]" : "",
        ].join(" ")}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            {threatBadge(threat)}
            <h4 className="text-base font-semibold text-heading">{c.name}</h4>
          </div>
          <p className="text-xs text-body leading-snug max-w-lg">{battlecard.headline}</p>
        </div>
        <div className="flex gap-6 shrink-0 text-right">
          {c.reviewCount != null && (
            <div>
              <p className="text-xl font-bold text-heading tabular-nums">{c.reviewCount}</p>
              <p className="text-2xs text-subtle">reviews</p>
            </div>
          )}
          {c.rating != null && (
            <div>
              <p className="text-xl font-bold text-brand tabular-nums">{c.rating.toFixed(1)}★</p>
              <p className="text-2xs text-subtle">rating</p>
            </div>
          )}
          {c.rank != null && (
            <div>
              <p className="text-xl font-bold text-heading tabular-nums">#{c.rank}</p>
              <p className="text-2xs text-subtle">local rank</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
        {/* Score bars */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-subtle uppercase tracking-wider">Competitive Scores</p>
          <ScoreBar score={scored.reviewScore} label="Review Volume" />
          <ScoreBar score={scored.ratingScore} label="Star Rating" />
          <ScoreBar score={scored.positionScore} label="Local Rank" />
          <ScoreBar score={scored.overallScore} label="Overall Threat" />
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Their strengths */}
          {battlecard.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-danger)] uppercase tracking-wider mb-2">
                Their Strengths
              </p>
              <ul className="flex flex-col gap-1.5">
                {battlecard.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-body flex gap-1.5">
                    <span className="text-[var(--color-danger)] font-bold shrink-0">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Counter angles */}
          <div>
            <p className="text-xs font-semibold text-brand uppercase tracking-wider mb-2">
              Counter Angles
            </p>
            <ul className="flex flex-col gap-2">
              {battlecard.angles.map((a, i) => (
                <li key={i} className="text-xs text-body flex gap-1.5 leading-relaxed">
                  <span className="text-brand font-bold shrink-0 mt-0.5">→</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MarketContext({
  report,
  scored,
}: {
  report: ProbeReport;
  scored: ScoredCompetitor[];
}) {
  const places = report.sources.googlePlaces.data;
  const nonProspect = scored.filter((s) => !s.isProspect);
  if (nonProspect.length === 0) return null;

  const avgReviews = Math.round(
    nonProspect.reduce((s, c) => s + (c.data.reviewCount ?? 0), 0) / nonProspect.length,
  );
  const topReviews = Math.max(...nonProspect.map((c) => c.data.reviewCount ?? 0));
  const avgRating =
    nonProspect.filter((c) => c.data.rating != null).length > 0
      ? (
          nonProspect
            .filter((c) => c.data.rating != null)
            .reduce((s, c) => s + (c.data.rating ?? 0), 0) /
          nonProspect.filter((c) => c.data.rating != null).length
        ).toFixed(1)
      : "—";

  const prospectReviews = places?.reviewCount ?? 0;
  const reviewGap = avgReviews - prospectReviews;

  return (
    <Card accent className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-brand uppercase tracking-wider">
        Market Context — {report.firm.city}
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-2xl font-bold text-heading tabular-nums">{avgReviews}</p>
          <p className="text-xs text-subtle">Avg competitor reviews</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-heading tabular-nums">{topReviews}</p>
          <p className="text-xs text-subtle">Top performer reviews</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-heading tabular-nums">{avgRating}★</p>
          <p className="text-xs text-subtle">Avg competitor rating</p>
        </div>
      </div>
      {reviewGap > 0 ? (
        <p className="text-sm text-body leading-relaxed">
          <span className="font-semibold text-brand">{report.firm.name}</span> is{" "}
          <span className="font-semibold">{reviewGap} reviews</span> behind the local average.
          Our Gravity platform closes this gap in 60–90 days — that's your fastest path to local pack
          visibility without ad spend.
        </p>
      ) : (
        <p className="text-sm text-body leading-relaxed">
          <span className="font-semibold text-brand">{report.firm.name}</span> already matches or
          exceeds the local review average. The opportunity is differentiation: content depth, conversion
          optimization, and moving from #
          {report.sources.serpLocal.data?.firmRankInLocalPack ?? "?"} to #1 in the local pack.
        </p>
      )}
    </Card>
  );
}
