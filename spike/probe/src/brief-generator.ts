import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "node:fs/promises";
import { argv, exit, stdout } from "node:process";
import type { ProbeReport } from "./types.ts";

function usage(): never {
  stdout.write(
    [
      "Usage: tsx src/brief-generator.ts <probe-report.json> [--out brief.md]",
      "",
      "Example:",
      "  tsx src/brief-generator.ts test-data/runs/01-titan-law-firm.json",
      "  tsx src/brief-generator.ts report.json --out titan-brief.md",
      "",
      "Environment:",
      "  ANTHROPIC_API_KEY  required",
      "",
    ].join("\n")
  );
  exit(1);
}

function parseArgs(): { reportFile: string; outFile: string | null } {
  const args = argv.slice(2);
  let outFile: string | null = null;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--out" && args[i + 1]) {
      outFile = args[++i];
    } else if (a.startsWith("--out=")) {
      outFile = a.slice(6);
    } else {
      positional.push(a);
    }
  }
  if (positional.length < 1) usage();
  return { reportFile: positional[0], outFile };
}

function buildProbeContext(r: ProbeReport): string {
  const lines: string[] = [];

  lines.push(`FIRM: ${r.firm.name}`);
  lines.push(`WEBSITE: ${r.firm.url}`);
  lines.push(`MARKET: ${r.firm.city}, ${r.firm.state}`);
  lines.push(`PRACTICE AREA: ${r.firm.practiceArea}`);
  lines.push(`COVERAGE SCORE: ${r.coverageScore}/100 (brief-ready: ${r.briefInputReady ? "yes" : "no"})`);

  const s = r.sources.siteScrape;
  lines.push(`\n--- WEBSITE ANALYSIS (status: ${s.status}) ---`);
  if (s.data) {
    lines.push(`Page title: ${s.data.title ?? "(none)"}`);
    lines.push(`Meta description: ${s.data.metaDescription ?? "(none)"}`);
    lines.push(`H1 headings: ${s.data.h1s.join(" | ") || "(none)"}`);
    lines.push(`H2 headings: ${s.data.h2s.slice(0, 5).join(" | ") || "(none)"}`);
    lines.push(`Phone numbers: ${s.data.phoneNumbers.join(", ") || "(none found)"}`);
    lines.push(`Emails: ${s.data.emails.join(", ") || "(none found)"}`);
    lines.push(
      `Intake signals: contact-form=${s.data.hasContactForm}, click-to-call=${s.data.hasClickToCallLink}, ` +
        `online-booking=${s.data.hasOnlineBooking}, live-chat=${s.data.hasLiveChat}, mobile-viewport=${s.data.hasMobileViewport}`
    );
    lines.push(`Practice area terms on site: ${s.data.practiceAreaMentions.slice(0, 8).join(", ") || "(none)"}`);
    lines.push(`Trust signals: ${s.data.trustSignals.join(", ") || "(none)"}`);
    lines.push(`Review widget signals: ${s.data.reviewWidgetSignals.join(", ") || "(none)"}`);
    lines.push(`Structured data (JSON-LD types): ${s.data.schemaTypesFound.join(", ") || "(none)"}`);
    lines.push(`CTA text samples: ${s.data.ctaTextSamples.slice(0, 6).join(" | ") || "(none)"}`);
    lines.push(`Attorney names found: ${s.data.attorneyNameCandidates.join(", ") || "(none)"}`);
    if (s.data.warnings.length) lines.push(`Site warnings: ${s.data.warnings.join("; ")}`);
  } else if (s.error) {
    lines.push(`Site scrape error: ${s.error}`);
  }

  const p = r.sources.googlePlaces;
  lines.push(`\n--- GOOGLE BUSINESS PROFILE (status: ${p.status}${p.data?.isMock ? ", MOCK" : ""}) ---`);
  if (p.data) {
    lines.push(`Match confidence: ${p.data.matchConfidence}`);
    lines.push(`Matched name: ${p.data.matchedName ?? "(no match)"}`);
    lines.push(`Address: ${p.data.formattedAddress ?? "(unknown)"}`);
    lines.push(`Rating: ${p.data.rating ?? "(unknown)"} (${p.data.reviewCount ?? "?"} reviews)`);
    lines.push(`Primary category: ${p.data.primaryCategory ?? "(unknown)"}`);
    lines.push(`Has photos: ${p.data.hasPhotos}, Has hours: ${p.data.hasHours}`);
  } else if (p.error) {
    lines.push(`Places error: ${p.error}`);
  }

  const sr = r.sources.serpLocal;
  lines.push(`\n--- LOCAL SEARCH RANKING (status: ${sr.status}${sr.data?.isMock ? ", MOCK" : ""}) ---`);
  if (sr.data) {
    lines.push(`Query: "${sr.data.query}"`);
    lines.push(`Firm rank in local pack: ${sr.data.firmRankInLocalPack ?? "not found"}`);
    lines.push(`Firm rank in organic: ${sr.data.firmRankInOrganic ?? "not found"}`);
    if (sr.data.topLocalPackCompetitors.length) {
      lines.push(`Top local pack competitors:`);
      for (const c of sr.data.topLocalPackCompetitors.slice(0, 5)) {
        lines.push(`  ${c.rank}. ${c.name} — ★${c.rating ?? "?"} (${c.reviewCount ?? "?"} reviews)`);
      }
    }
    if (sr.data.topOrganicCompetitors.length) {
      lines.push(`Top organic competitors:`);
      for (const c of sr.data.topOrganicCompetitors.slice(0, 5)) {
        lines.push(`  ${c.rank}. ${c.name}`);
      }
    }
  } else if (sr.error) {
    lines.push(`SERP error: ${sr.error}`);
  }

  if (r.concerns.length) {
    lines.push(`\n--- KEY CONCERNS (${r.concerns.length}) ---`);
    r.concerns.forEach((c) => lines.push(`• ${c}`));
  }

  return lines.join("\n");
}

// Stable system prompt — cached on first request, reused on subsequent calls for the same firm batch.
const SYSTEM_PROMPT = `You are a senior digital marketing strategist at Retainer Reach, a boutique agency \
that helps law firms dominate their local markets through video-first content, local SEO, and \
conversion-optimized websites.

You are generating an OPENER BRIEF — a structured intelligence document that a Retainer Reach sales \
rep will use during their first call with this attorney or firm administrator. Analyze the probe data \
and produce a brief that:

1. Shows you've done your homework on their specific digital presence
2. Identifies the most impactful problems in plain language (not jargon)
3. Frames each problem in terms of lost revenue or lost clients — not just "SEO issues"
4. Prioritizes 3-5 concrete talking points the sales rep can raise naturally
5. Suggests a compelling opening hook that references something specific to this firm

TONE: Confident, specific, and empathetic. You are not criticizing — you are showing the attorney \
that you see what they're up against and have a plan. Avoid generic platitudes. Reference specific \
details from the probe data (actual page titles, competitor names, review counts, missing intake \
signals). If data is marked MOCK, note that real data will sharpen the picture.

OUTPUT FORMAT (use these exact headings):
# Opener Brief: [Firm Name]
## Quick Facts
## Opening Hook
## Key Findings
### Website & Conversion
### Google Presence
### Local Search Competition
## Talking Points
## Objection Prep
## Recommended First Move`;

async function main(): Promise<void> {
  const { reportFile, outFile } = parseArgs();

  const raw = await readFile(reportFile, "utf-8");
  const report = JSON.parse(raw) as ProbeReport;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    stdout.write("Error: ANTHROPIC_API_KEY environment variable is not set\n");
    exit(1);
  }

  const client = new Anthropic({ apiKey });
  const probeContext = buildProbeContext(report);
  const userText = `Generate an opener brief for the following law firm probe report:\n\n${probeContext}`;

  stdout.write(`Generating opener brief for ${report.firm.name}...\n\n`);

  // Guard: only attach cache_control to non-empty text blocks to avoid the
  // "cache_control cannot be set for empty text blocks" 400 error from the API.
  const systemText = SYSTEM_PROMPT.trim();
  const systemParam: Anthropic.MessageParam["content"] | undefined = undefined;
  void systemParam; // unused — we build the system param separately below

  const chunks: string[] = [];

  const stream = client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    ...(systemText
      ? {
          system: [
            {
              type: "text" as const,
              text: systemText,
              cache_control: { type: "ephemeral" as const },
            },
          ],
        }
      : {}),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text" as const,
            // User message is dynamic per firm, so no cache_control here
            text: userText,
          },
        ],
      },
    ],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta" &&
      event.delta.text
    ) {
      stdout.write(event.delta.text);
      chunks.push(event.delta.text);
    }
  }

  const finalMsg = await stream.finalMessage();
  stdout.write("\n\n");
  stdout.write(
    `[tokens: input=${finalMsg.usage.input_tokens} output=${finalMsg.usage.output_tokens}]\n`
  );

  if (outFile) {
    const fullText = chunks.join("");
    await writeFile(outFile, fullText, "utf-8");
    stdout.write(`Wrote ${outFile} (${fullText.length} chars)\n`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  exit(2);
});
