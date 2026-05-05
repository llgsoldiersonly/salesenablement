/**
 * Prompts for the closer-call brief generator.
 *
 * Mirrors spike/probe/src/brief-generator.ts. Keep the system-prompt structure
 * in sync — the generator's accuracy depends on it.
 *
 * IMPORTANT: every text block we send to Anthropic must be non-empty before
 * cache_control is attached. The runtime guard in the handler asserts this
 * to avoid the `cache_control cannot be set for empty text blocks` 400.
 */

import {
  CORE_PACKAGES,
  PACKAGES,
  formatUsd,
} from "../src/lib/packages.js";
import type { PackageRecommendation, ProbeReport } from "../src/types/index.js";

interface TierFeatureMatrix {
  gmbLocations: number;
  targetKeywords: number;
  optimizedInnerPages: number;
  innerPageMinWords: number;
  blogPostsPerMonth: { total: number; en: number; es: number };
  youtubeVideosPerMonth: { total: number; en: number; es: number };
  faqVoiceSearchBlogsPerMonth: number;
  aiSearchBlogsPerMonth: number;
  parentSeoPages: { total: number; en: number; es: number };
  napDirectories: number;
  phase2DaysFromSigning: number;
  phase3DaysFromSigning: number;
}

const TIER_FEATURES: Record<"lapetus" | "rhea" | "titan", TierFeatureMatrix> = {
  lapetus: {
    gmbLocations: 1, targetKeywords: 20, optimizedInnerPages: 20, innerPageMinWords: 1000,
    blogPostsPerMonth: { total: 3, en: 2, es: 1 },
    youtubeVideosPerMonth: { total: 2, en: 1, es: 1 },
    faqVoiceSearchBlogsPerMonth: 2, aiSearchBlogsPerMonth: 2,
    parentSeoPages: { total: 40, en: 20, es: 20 },
    napDirectories: 10, phase2DaysFromSigning: 30, phase3DaysFromSigning: 60,
  },
  rhea: {
    gmbLocations: 2, targetKeywords: 25, optimizedInnerPages: 25, innerPageMinWords: 1000,
    blogPostsPerMonth: { total: 6, en: 3, es: 3 },
    youtubeVideosPerMonth: { total: 4, en: 2, es: 2 },
    faqVoiceSearchBlogsPerMonth: 4, aiSearchBlogsPerMonth: 3,
    parentSeoPages: { total: 100, en: 50, es: 50 },
    napDirectories: 50, phase2DaysFromSigning: 30, phase3DaysFromSigning: 60,
  },
  titan: {
    gmbLocations: 5, targetKeywords: 30, optimizedInnerPages: 30, innerPageMinWords: 1500,
    blogPostsPerMonth: { total: 8, en: 4, es: 4 },
    youtubeVideosPerMonth: { total: 6, en: 3, es: 3 },
    faqVoiceSearchBlogsPerMonth: 7, aiSearchBlogsPerMonth: 5,
    parentSeoPages: { total: 200, en: 100, es: 100 },
    napDirectories: 100, phase2DaysFromSigning: 60, phase3DaysFromSigning: 105,
  },
};

export function buildSystemPrompt(): string {
  const tierLines = CORE_PACKAGES.map((id) => {
    const p = PACKAGES[id];
    const f = TIER_FEATURES[id as "lapetus" | "rhea" | "titan"];
    return [
      `### ${p.name.toUpperCase()} — ${p.tagline}`,
      `Monthly: ${formatUsd(p.monthlyFee)}/mo${p.monthlyFeeNote ? ` (${p.monthlyFeeNote})` : ""}`,
      `Charged at signing: ${formatUsd(p.chargedAtSigning)} — ${p.chargedAtSigningNote ?? ""}`,
      p.recommendedAdSpend != null
        ? `Recommended ad spend: ${formatUsd(p.recommendedAdSpend)}/mo`
        : "",
      `Ideal for: ${p.idealClientProfile}`,
      `Features: ${f.gmbLocations} GMB location(s); ${f.targetKeywords} target keywords; ${f.optimizedInnerPages} inner pages (min ${f.innerPageMinWords} words); ${f.blogPostsPerMonth.total} blogs/mo (${f.blogPostsPerMonth.en} EN + ${f.blogPostsPerMonth.es} ES); ${f.youtubeVideosPerMonth.total} videos/mo; ${f.faqVoiceSearchBlogsPerMonth} FAQ voice blogs/mo; ${f.aiSearchBlogsPerMonth} AI search blogs/mo; ${f.parentSeoPages.total} parent SEO pages; ${f.napDirectories} NAP directories. Phase 2 ~${f.phase2DaysFromSigning}d; Phase 3 ~${f.phase3DaysFromSigning}d.`,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  const gravity = PACKAGES.gravity;
  const liveIntakes = PACKAGES["live-intakes"];

  return [
    "# LLG Closer-Call Briefing System",
    "",
    "You write closer-call briefings for Legal Leads Group (LLG / Lucrative Legal). The output is read by a closer rep on their phone or laptop sixty seconds before they dial a law firm prospect. There is no editor — the brief goes directly into the rep's hand. Be specific, defensible, and free of generic agency-speak.",
    "",
    "## Style rules",
    "- Use the firm's actual data points (review counts, load times, keyword counts, competitor names) — never invent metrics.",
    "- Cite the source of every number in italics, e.g. *(source: Google Places)*, *(source: site scrape)*, *(source: SerpAPI)*.",
    "- Be specific: \"23 reviews vs. competitor's 287\" beats \"low review count\".",
    "- Aggressive but professional. Emotional triggers OK; ethical lapses not OK.",
    "- Plain English. No marketing buzzwords (\"synergy\", \"holistic\", \"best-in-class\", \"world-class\").",
    "- The brief is read on a phone — keep paragraphs to two or three sentences.",
    "- If a data field is marked MOCK, do not quote those numbers as real. Note the limitation instead.",
    "",
    "## LLG Package Catalog (use exact pricing — do not improvise)",
    "",
    "Firms pick ONE core package below. Live Intakes (EN/ES) is bundled FREE with every core package — mention as bundled value, not an upsell. Gravity is sold standalone OR layered onto a core package.",
    "",
    "### Core packages",
    "",
    tierLines,
    "",
    "### Add-on packages",
    "",
    `**${gravity.name}** — ${gravity.tagline}.`,
    `- Standalone: ${formatUsd(gravity.monthlyFee)}/mo (FREE first 90 days, then $599/mo when standalone).`,
    "- Added to **Rhea or Titan**: FREE first 90 days, then $599/mo. (Promo only fires for these two tiers.)",
    `- Added to **Lapetus**: ${formatUsd(gravity.monthlyFee)}/mo additional. Sales rep can negotiate. No promo.`,
    "- Adds (over and above any SEO package): 100 local directories + 50 NAP POWER submissions, 3 GMB article posts/wk, 1 GMB video produced/mo, Yahoo/Bing listings, full GMB optimization.",
    "",
    `**${liveIntakes.name}** — ${liveIntakes.tagline}.`,
    `- ${formatUsd(liveIntakes.monthlyFee)}/mo standalone for firms that want intake answering only with no other LLG service.`,
    "- BUNDLED FREE inside Gravity, Lapetus, Rhea, and Titan — present as included value, not an upsell.",
    "",
    "## Output format (Markdown — exact section order, no preamble)",
    "",
    "1. `# Firm Briefing — <Firm Name>` (subtitle on next line: city, state, practice area, today's date)",
    "2. `## Snapshot` — three to five tight bullets covering: review count + average rating, biggest local-pack competitor's review count, market position summary in one sentence. Cite each source.",
    "3. `## Gaps` — three to five gap cards. Each is `### <Gap title>` followed by one or two sentences. Examples: \"Only X Google reviews\", \"No click-to-call link\", \"Slow mobile load time\", \"Missing Spanish content\". Cite source for each.",
    "4. `## Market Leader Comparison` — name the firm beating them in the local pack, their review count and rating, one quote-style sentence the closer can read aloud verbatim.",
    "5. `## Intake Leak` — a single warning paragraph if the site has no contact form AND no click-to-call link, OR no after-hours capture, OR a long contact form. Reference the exact gap. End with: *\"We fix this in week 1 of any package.\"* Skip this section entirely if intake is healthy.",
    "6. `## Say This` — a 2–3 sentence opener script the rep reads verbatim. First-person, conversational. Names the firm and one specific gap. Ends with a soft transition question.",
    "7. `## Recommended Package` — the recommended core tier (or Gravity standalone if that is what the recommendation block says), monthly cost, what's included that directly addresses this firm's gaps. Mention Gravity add-on if recommended. Quote the monthlyFee from the catalog above.",
    "8. `## Discovery Questions` — 3–4 questions the closer asks to qualify the prospect, written as direct quotes the rep can read.",
    "9. `## Objection Rebuttals` — 2–3 likely objections (\"too busy\", \"too expensive\", \"already working with someone\") with one-sentence rebuttals each.",
    "",
    "Always end with this italicized compliance footer:",
    "*Estimates and benchmarks are based on publicly available data. Not legal or business guarantees. All competitor data is for illustrative comparative analysis.*",
  ].join("\n");
}

export function buildUserPrompt(report: ProbeReport, rec: PackageRecommendation): string {
  const lines: string[] = [];
  lines.push(`# Firm: ${report.firm.name}`);
  lines.push(`URL: ${report.firm.url}`);
  lines.push(`Market: ${report.firm.city}, ${report.firm.state}`);
  lines.push(`Practice area: ${report.firm.practiceArea}`);
  lines.push(`Probe coverage score: ${report.coverageScore}/100`);
  if (report.concerns.length) {
    lines.push("Probe concerns:");
    report.concerns.forEach((c) => lines.push(`  - ${c}`));
  }
  lines.push("");

  const site = report.sources.siteScrape.data;
  lines.push("## Site scrape (source: live homepage fetch)");
  if (site == null) {
    lines.push(`  Site scrape FAILED: ${report.sources.siteScrape.error ?? "unknown"}`);
  } else {
    lines.push(`  Title: ${site.title ?? "(none)"}`);
    lines.push(`  H1: ${site.h1s.join(" | ") || "(none)"}`);
    lines.push(`  Phone numbers: ${site.phoneNumbers.join(", ") || "(none)"}`);
    lines.push(`  Intake signals: form=${site.hasContactForm}, click-to-call=${site.hasClickToCallLink}, online-booking=${site.hasOnlineBooking}, live-chat=${site.hasLiveChat}, mobile-viewport=${site.hasMobileViewport}`);
    lines.push(`  Practice mentions: ${site.practiceAreaMentions.join(", ") || "(none)"}`);
    lines.push(`  Trust signals: ${site.trustSignals.join(", ") || "(none)"}`);
    lines.push(`  Schema types: ${site.schemaTypesFound.join(", ") || "(none)"}`);
    lines.push(`  Attorney names: ${site.attorneyNameCandidates.join(", ") || "(none)"}`);
    lines.push(`  CTA samples: ${site.ctaTextSamples.slice(0, 6).join(" | ") || "(none)"}`);
    lines.push(`  Page bytes: ${site.pageBytes}, fetch ms: ${site.fetchMs}`);
    if (site.warnings.length) lines.push(`  Warnings: ${site.warnings.join("; ")}`);
  }
  lines.push("");

  const places = report.sources.googlePlaces.data;
  lines.push(
    `## Google Places${places?.isMock ? " [MOCK DATA — DO NOT QUOTE NUMBERS AS REAL]" : " (source: Google Places API)"}`
  );
  if (places == null) {
    lines.push(`  FAILED: ${report.sources.googlePlaces.error ?? "unknown"}`);
  } else {
    lines.push(`  Match: ${places.matchConfidence} → ${places.matchedName ?? "(no match)"}`);
    lines.push(`  Address: ${places.formattedAddress ?? "(none)"}`);
    lines.push(`  Rating: ${places.rating ?? "(none)"} (${places.reviewCount ?? "?"} reviews)`);
  }
  lines.push("");

  const serp = report.sources.serpLocal.data;
  lines.push(
    `## SERP / local pack${serp?.isMock ? " [MOCK DATA — DO NOT QUOTE NUMBERS AS REAL]" : " (source: SerpAPI)"}`
  );
  if (serp == null) {
    lines.push(`  FAILED: ${report.sources.serpLocal.error ?? "unknown"}`);
  } else {
    lines.push(`  Query: ${serp.query}`);
    lines.push(`  Firm rank in local pack: ${serp.firmRankInLocalPack ?? "not present"}`);
    lines.push("  Top local pack competitors:");
    for (const c of serp.topLocalPackCompetitors.slice(0, 5)) {
      lines.push(`    ${c.rank}. ${c.name} — ${c.rating ?? "?"} stars, ${c.reviewCount ?? "?"} reviews`);
    }
  }
  lines.push("");

  lines.push("## Recommended package (computed deterministically — use exactly this in the brief)");
  const primary = PACKAGES[rec.primary];
  lines.push(`  Primary: ${primary.name} (${formatUsd(primary.monthlyFee)}/mo)`);
  lines.push("  Reasons:");
  rec.primaryReasons.forEach((r) => lines.push(`    - ${r}`));
  if (rec.addGravity) {
    lines.push("  Add Gravity: yes");
    lines.push("  Gravity reasons:");
    rec.gravityReasons.forEach((r) => lines.push(`    - ${r}`));
  } else {
    lines.push("  Add Gravity: no");
  }
  lines.push(`  Estimated monthly: ${formatUsd(rec.estimatedMonthly)}`);
  lines.push(`  First month billed: ${formatUsd(rec.estimatedFirstMonthBilled)}`);
  if (rec.alternatives.length) {
    lines.push("  Alternatives:");
    rec.alternatives.forEach((a) =>
      lines.push(`    - ${PACKAGES[a.id].name}: ${a.reason}`)
    );
  }
  lines.push("");
  lines.push(
    "Generate the closer-call brief now using the spec in the system prompt. Use ONLY the data above — do not invent reviews, ratings, or competitor names."
  );
  return lines.join("\n");
}
