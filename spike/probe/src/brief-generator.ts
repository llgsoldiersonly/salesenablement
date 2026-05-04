import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "node:fs/promises";
import { argv, exit, stderr, stdout } from "node:process";
import {
  CORE_PACKAGES,
  PACKAGES,
  TIER_FEATURES,
  formatUsd,
  recommendPackage,
  type PackageRecommendation,
} from "./packages.ts";
import type { ProbeReport } from "./types.ts";

interface CliArgs {
  reportPath: string;
  outFile: string | null;
  model: string;
}

function parseArgs(): CliArgs {
  const args = argv.slice(2);
  let outFile: string | null = null;
  let model = "claude-opus-4-7";
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--out" && args[i + 1]) outFile = args[++i];
    else if (a.startsWith("--out=")) outFile = a.slice(6);
    else if (a === "--model" && args[i + 1]) model = args[++i];
    else positional.push(a);
  }
  if (positional.length < 1) {
    stderr.write(
      [
        "Usage: tsx src/brief-generator.ts <probe-report.json> [--out brief.md] [--model claude-opus-4-7]",
        "",
        "Generates an LLG closer-call brief from a ProbeReport JSON.",
        "Streams to stdout; if --out is given, also writes the final brief to disk.",
        "",
        "Environment:",
        "  ANTHROPIC_API_KEY  required",
        "",
      ].join("\n")
    );
    exit(1);
  }
  return { reportPath: positional[0], outFile, model };
}

/**
 * Stable system prompt — LLG closer-call playbook + full package catalog.
 *
 * Must be non-empty: Anthropic returns 400 (`cache_control cannot be set for
 * empty text blocks`) if cache_control is attached to text === "". The runtime
 * guard in main() asserts this before sending.
 */
function buildSystemPrompt(): string {
  const tierLines = CORE_PACKAGES.map((id) => {
    const p = PACKAGES[id];
    const f = TIER_FEATURES[id as "lapetus" | "rhea" | "titan"];
    return [
      `### ${p.name.toUpperCase()} — ${p.tagline}`,
      `Monthly: ${formatUsd(p.monthlyFee)}/mo${p.monthlyFeeNote ? ` (${p.monthlyFeeNote})` : ""}`,
      `Charged at signing: ${formatUsd(p.chargedAtSigning)} — ${p.chargedAtSigningNote ?? ""}`,
      p.recommendedAdSpend != null
        ? `Recommended ad spend: ${formatUsd(p.recommendedAdSpend)}/mo (${p.recommendedAdSpendNote ?? ""})`
        : "",
      `Ideal for: ${p.idealClientProfile}`,
      `Features: ${f.gmbLocations} GMB location(s); ${f.targetKeywords} target keywords; ${f.optimizedInnerPages} inner pages (min ${f.innerPageMinWords} words); ${f.blogPostsPerMonth.total} blogs/mo (${f.blogPostsPerMonth.en} EN + ${f.blogPostsPerMonth.es} ES); ${f.youtubeVideosPerMonth.total} YouTube videos/mo; ${f.faqVoiceSearchBlogsPerMonth} FAQ voice blogs/mo; ${f.aiSearchBlogsPerMonth} AI search blogs/mo; ${f.parentSeoPages.total} parent SEO pages; ${f.napDirectories} NAP directories. Phase 2 live ~${f.phase2DaysFromSigning}d from signing; Phase 3 complete ~${f.phase3DaysFromSigning}d.`,
    ]
      .filter(Boolean)
      .join("\n");
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
    "Firms pick ONE core package below. Live Intakes (EN/ES) is bundled FREE with every core package — mention as bundled value, not an upsell. Gravity is sold standalone OR added on top of a core package.",
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

function buildUserPrompt(report: ProbeReport, rec: PackageRecommendation): string {
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
    lines.push(`  Meta description: ${site.metaDescription ?? "(none)"}`);
    lines.push(`  H1: ${site.h1s.join(" | ") || "(none)"}`);
    lines.push(`  Phone numbers found: ${site.phoneNumbers.join(", ") || "(none)"}`);
    lines.push(
      `  Intake signals: form=${site.hasContactForm}, click-to-call=${site.hasClickToCallLink}, online-booking=${site.hasOnlineBooking}, live-chat=${site.hasLiveChat}, mobile-viewport=${site.hasMobileViewport}`
    );
    lines.push(`  Practice area mentions: ${site.practiceAreaMentions.join(", ") || "(none)"}`);
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
    lines.push(`  Places lookup FAILED: ${report.sources.googlePlaces.error ?? "unknown"}`);
  } else {
    lines.push(`  Match confidence: ${places.matchConfidence}`);
    lines.push(`  Matched name: ${places.matchedName ?? "(no match)"}`);
    lines.push(`  Address: ${places.formattedAddress ?? "(none)"}`);
    lines.push(`  Rating: ${places.rating ?? "(none)"}`);
    lines.push(`  Review count: ${places.reviewCount ?? "(none)"}`);
    lines.push(`  Categories: ${places.categories.join(", ") || "(none)"}`);
  }
  lines.push("");

  const serp = report.sources.serpLocal.data;
  lines.push(
    `## SERP / local pack${serp?.isMock ? " [MOCK DATA — DO NOT QUOTE NUMBERS AS REAL]" : " (source: SerpAPI)"}`
  );
  if (serp == null) {
    lines.push(`  SERP lookup FAILED: ${report.sources.serpLocal.error ?? "unknown"}`);
  } else {
    lines.push(`  Query: ${serp.query}`);
    lines.push(`  Firm rank in local pack: ${serp.firmRankInLocalPack ?? "not present"}`);
    lines.push(`  Firm rank in organic: ${serp.firmRankInOrganic ?? "not present"}`);
    lines.push("  Top local pack competitors:");
    for (const c of serp.topLocalPackCompetitors.slice(0, 5)) {
      lines.push(
        `    ${c.rank}. ${c.name} — ${c.rating ?? "?"} stars, ${c.reviewCount ?? "?"} reviews`
      );
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
  lines.push(
    `  Estimated monthly (after promo period if applicable): ${formatUsd(rec.estimatedMonthly)}`
  );
  lines.push(`  First month billed: ${formatUsd(rec.estimatedFirstMonthBilled)}`);
  if (rec.alternatives.length) {
    lines.push("  Alternatives the closer can offer:");
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

async function main(): Promise<void> {
  const { reportPath, outFile, model } = parseArgs();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    stderr.write("Error: ANTHROPIC_API_KEY environment variable is required.\n");
    exit(1);
  }

  const raw = await readFile(reportPath, "utf-8");
  const report = JSON.parse(raw) as ProbeReport;
  const rec = recommendPackage(report);

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(report, rec);

  // Defensive guard: prompt caching breakpoints fail with a 400 if applied to
  // an empty text block. Never send `cache_control` on `text: ""`.
  if (systemPrompt.trim() === "") {
    stderr.write("Error: system prompt is empty — refusing to send empty cache breakpoint.\n");
    exit(2);
  }
  if (userPrompt.trim() === "") {
    stderr.write("Error: user prompt is empty — nothing to brief on.\n");
    exit(2);
  }

  const client = new Anthropic({ apiKey });

  stderr.write(`Generating brief for ${report.firm.name} via ${model}...\n`);
  stderr.write(
    `Recommended: ${rec.primary}${rec.addGravity ? " + Gravity" : ""} (${formatUsd(rec.estimatedMonthly)}/mo est)\n`
  );
  stderr.write("\n--- BRIEF ---\n");

  const stream = client.messages.stream({
    model,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: [
      // Cache_control attaches only because the runtime guard above asserts
      // systemPrompt.trim() !== "". An empty text block here would 400.
      { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      { role: "user", content: [{ type: "text", text: userPrompt }] },
    ],
  });

  stream.on("text", (delta) => {
    stdout.write(delta);
  });

  const final = await stream.finalMessage();
  stderr.write("\n--- END BRIEF ---\n");

  const briefText = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  if (final.usage) {
    const u = final.usage;
    stderr.write(
      `\nTokens — input: ${u.input_tokens}, output: ${u.output_tokens}, cache_read: ${u.cache_read_input_tokens ?? 0}, cache_write: ${u.cache_creation_input_tokens ?? 0}\n`
    );
  }

  if (outFile) {
    await writeFile(outFile, briefText, "utf-8");
    stderr.write(`Wrote ${outFile} (${briefText.length} bytes)\n`);
  }
}

main().catch((err) => {
  stderr.write(`\nFatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  exit(2);
});
