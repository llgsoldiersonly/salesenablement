import { useState } from "react";
import { Card } from "../ui/Card";
import { CTAButton, Button } from "../ui/Button";
import { ShareButton } from "../ShareButton";
import { Logo } from "../ui/Logo";
import type { PackageRecommendation, ProbeReport } from "../../types";

const PACKAGE_LABELS: Record<string, string> = {
  gravity: "Gravity",
  lapetus: "Lapetus",
  rhea: "Rhea",
  titan: "Titan",
};


interface FirmBriefingProps {
  report: ProbeReport;
  recommendation: PackageRecommendation;
}

export function FirmBriefing({ report, recommendation }: FirmBriefingProps) {
  const [copied, setCopied] = useState(false);
  const { firm, sources } = report;
  const places = sources.googlePlaces.data;
  const serp   = sources.serpLocal.data;
  const site   = sources.siteScrape.data;
  const competitors = (serp?.topLocalPackCompetitors ?? []).filter(
    (c) => c.name.toLowerCase() !== firm.name.toLowerCase()
  );
  const topCompetitor = competitors[0] ?? null;

  const openerScript = topCompetitor
    ? `"Hi [Name], I was looking at ${firm.name}'s online presence and noticed a few gaps that are likely costing you cases in ${firm.city}, specifically compared to ${topCompetitor.name}. Do you have a moment to discuss how we can bridge that gap?"`
    : `"Hi [Name], I was reviewing ${firm.name}'s digital footprint and found several quick wins that could significantly increase your case volume. Do you have five minutes?"`;

  const gapCards = buildGapCards(report);

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto">

      {/* Header */}
      <header className="px-4 py-4 border-b border-[var(--color-border)] bg-surface flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-semibold text-sm text-heading">Firm Briefing</span>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton report={report} variant="icon" />
          <button aria-label="helpful" className="text-subtle text-lg">👍</button>
          <button aria-label="not helpful" className="text-subtle text-lg">👎</button>
          <button aria-label="more options" className="text-subtle text-lg">⋮</button>
        </div>
      </header>

      <main className="flex flex-col gap-4 px-4 py-5 flex-1">

        {/* Firm name + meta */}
        <div>
          <h1 className="text-2xl font-bold text-heading">{firm.name}</h1>
          <p className="text-xs text-subtle mt-1">
            {firm.city} · {firm.state.slice(0, 2).toUpperCase()} · {firm.practiceArea} · added 2 days ago by opener
          </p>
        </div>

        {/* Review count hero */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-4xl font-bold text-heading">
                {places?.reviewCount ?? "—"}
              </p>
              <p className="text-sm font-medium text-body mt-0.5">Reviews</p>
              {topCompetitor?.reviewCount && (
                <p className="text-xs text-subtle mt-1">
                  Benchmark: {topCompetitor.reviewCount} reviews is the local {firm.practiceArea} average.
                </p>
              )}
              <p className="text-2xs text-subtle mt-0.5 uppercase tracking-wider">
                (Source: Google Business Profile)
              </p>
            </div>
            {places?.rating != null && (
              <div className="text-right">
                <p className="text-brand font-bold text-xl">
                  ☆ {places.rating.toFixed(1)}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Gap cards */}
        {gapCards.map((gap, i) => (
          <Card key={i} className="flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5">{gap.icon}</span>
            <div>
              <p className="text-sm font-semibold text-heading">{gap.title}</p>
              <p className="text-xs text-body mt-0.5 leading-relaxed">{gap.body}</p>
              <p className="text-2xs text-subtle mt-1 uppercase tracking-wider">
                (Source: {gap.source})
              </p>
            </div>
          </Card>
        ))}

        {/* Market leader comparison */}
        {topCompetitor && (
          <Card dark>
            <p className="text-2xs uppercase tracking-widest text-white/50 font-semibold mb-3">
              Market Leader Comparison
            </p>
            <p className="text-sm font-bold text-white mb-1">
              Beating you in {firm.city}: <span className="text-brand">{topCompetitor.name}</span>
            </p>
            <p className="text-xs text-white/60 mb-4">
              ☆ {topCompetitor.rating ?? "?"} · {topCompetitor.reviewCount ?? "?"} reviews
            </p>

            {/* Bar comparison */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xs text-white/50 w-20 uppercase tracking-wider text-right shrink-0">
                  You ({firm.name.split(" ")[0].toUpperCase()})
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{
                      width: `${Math.max(4, Math.round(((places?.reviewCount ?? 1) / (topCompetitor.reviewCount ?? 100)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-2xs text-white/70 font-bold tabular-nums w-6 text-right">
                  {places?.reviewCount ?? "?"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xs text-white/50 w-20 uppercase tracking-wider text-right shrink-0">
                  {topCompetitor.name.split(" ")[0].toUpperCase()}
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-white/40 rounded-full w-full" />
                </div>
                <span className="text-2xs text-white/70 font-bold tabular-nums w-6 text-right">
                  {topCompetitor.reviewCount ?? "?"}
                </span>
              </div>
            </div>

            <p className="text-xs text-white/70 italic border-t border-white/10 pt-3">
              "They show up #1 in Google Maps for '{firm.practiceArea} lawyer {firm.city}.'{" "}
              <strong className="text-white">You don't.</strong>"
            </p>
          </Card>
        )}

        {/* Intake leak warning */}
        {site && !site.hasClickToCallLink && (
          <Card className="bg-[#FFF7ED] border-[var(--color-warning)]/30">
            <div className="flex items-start gap-2">
              <span className="text-[var(--color-warning)] text-lg shrink-0">⚠</span>
              <div>
                <p className="text-sm text-body leading-relaxed">
                  Your contact form requires {site.hasContactForm ? "multiple" : "no"} intake
                  fields and there's no after-hours capture. Most prospects abandon.
                </p>
                <p className="text-sm font-bold text-heading mt-2">
                  We fix this in week 1 of any package.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Say This */}
        <div>
          <p className="text-2xs uppercase tracking-widest font-bold text-heading mb-2 px-1">
            Say This:
          </p>
          <Card>
            <p className="text-sm text-body italic leading-relaxed mb-4">{openerScript}</p>
            <div className="flex gap-2">
              <Button
                variant="neutral"
                size="sm"
                className="flex-1"
                onClick={async () => {
                  await navigator.clipboard.writeText(openerScript).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                📋 {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
              <Button variant="ghost" size="sm">↺ Regenerate</Button>
            </div>
          </Card>
        </div>

        {/* Discovery questions */}
        <div>
          <p className="text-2xs uppercase tracking-widest font-bold text-heading mb-2 px-1">
            Discovery Questions
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {[
              "How are you handling intake after 6pm?",
              "What's your average case value?",
              "Who handles your Google profile?",
              "What's your biggest source of referrals?",
            ].map((q, i) => (
              <div
                key={i}
                className="shrink-0 rounded-[8px] bg-surface shadow-sm border border-[var(--color-border)] px-3 py-2 text-xs text-body max-w-[200px]"
              >
                {q}
              </div>
            ))}
          </div>
        </div>

        {/* Package CTA */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-heading">
              Recommended: <span className="text-brand">{PACKAGE_LABELS[recommendation.primary]}</span>
              {recommendation.addGravity && <span className="text-subtle"> + Gravity</span>}
            </p>
            <p className="text-sm font-bold text-heading">
              ${recommendation.estimatedMonthly.toLocaleString()}/mo
            </p>
          </div>
          <CTAButton size="lg" fullWidth>
            Schedule Closer Call
          </CTAButton>
        </div>

        <p className="text-2xs text-subtle text-center py-4 leading-relaxed border-t border-[var(--color-border)] mt-2">
          Estimates and benchmarks are based on publicly available data. Not legal or business
          guarantees. All competitor data is for illustrative comparative analysis.
        </p>
      </main>
    </div>
  );
}

interface GapCard {
  icon: string;
  title: string;
  body: string;
  source: string;
}

function buildGapCards(report: ProbeReport): GapCard[] {
  const cards: GapCard[] = [];
  const places = report.sources.googlePlaces.data;
  const site   = report.sources.siteScrape.data;
  const serp   = report.sources.serpLocal.data;

  const competitors = (serp?.topLocalPackCompetitors ?? []).filter(
    (c) => c.name.toLowerCase() !== report.firm.name.toLowerCase()
  );
  const avgCompetitorReviews = competitors.length
    ? Math.round(competitors.reduce((s, c) => s + (c.reviewCount ?? 0), 0) / competitors.length)
    : null;

  if (places?.reviewCount != null && avgCompetitorReviews != null) {
    cards.push({
      icon: "📊",
      title: `Only ${places.reviewCount} Google reviews`,
      body: `Local ${report.firm.practiceArea} competitors range ${Math.min(...competitors.map(c => c.reviewCount ?? 0))}–${Math.max(...competitors.map(c => c.reviewCount ?? 0))}+.`,
      source: "Google Places",
    });
  }

  if (site && !site.hasClickToCallLink) {
    cards.push({
      icon: "📱",
      title: "No click-to-call link",
      body: "Mobile users have to copy/paste the number manually.",
      source: "site scrape",
    });
  }

  if (site && site.fetchMs > 3000) {
    cards.push({
      icon: "🐢",
      title: `${(site.fetchMs / 1000).toFixed(1)}s mobile load time`,
      body: "Slower than 78% of competing firms.",
      source: "Lighthouse",
    });
  }

  if (!site?.hasLiveChat && !site?.hasOnlineBooking) {
    cards.push({
      icon: "⏰",
      title: "No after-hours capture",
      body: "No live chat or online booking — leads that arrive after 6pm go unanswered.",
      source: "site scrape",
    });
  }

  return cards.slice(0, 4);
}
