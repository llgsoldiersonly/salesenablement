import { writeFile } from "node:fs/promises";
import { argv, exit, stdout } from "node:process";
import { scrapeSite } from "./sources/site-scrape.ts";
import { fetchPlaces } from "./sources/places.ts";
import { fetchSerp } from "./sources/serp.ts";
import type { FirmInput, ProbeReport } from "./types.ts";

function parseArgs(): { firm: FirmInput; outFile: string | null } {
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
  if (positional.length < 5) {
    stdout.write(
      [
        "Usage: tsx src/probe.ts <firm-name> <url> <city> <state> <practice-area> [--out report.json]",
        '',
        'Example:',
        '  tsx src/probe.ts "Smith & Jones Law" "https://smithjoneslaw.com" "Tampa" "FL" "personal injury"',
        '',
        "Environment:",
        "  GOOGLE_PLACES_API_KEY  optional — without it, Places returns mock data",
        "  SERPAPI_KEY            optional — without it, SerpAPI returns mock data",
        "",
      ].join("\n")
    );
    exit(1);
  }
  const [name, url, city, state, practiceArea] = positional;
  return { firm: { name, url, city, state, practiceArea }, outFile };
}

function computeCoverage(report: Pick<ProbeReport, "sources">): { score: number; concerns: string[] } {
  const concerns: string[] = [];
  let score = 0;

  const site = report.sources.siteScrape;
  if (site.status === "ok" || site.status === "partial") {
    score += 40;
    if (site.data) {
      if (site.data.phoneNumbers.length === 0) concerns.push("No phone number found on site");
      if (site.data.h1s.length === 0) concerns.push("No H1 — site may be JS-rendered or unconventional");
      if (!site.data.hasContactForm && !site.data.hasClickToCallLink) {
        concerns.push("No contact form AND no click-to-call link — major intake leak signal");
      }
      if (site.data.warnings.length) site.data.warnings.forEach((w) => concerns.push(`site: ${w}`));
    }
  } else {
    concerns.push(`site-scrape failed: ${site.error ?? "unknown"} — homepage data missing`);
  }

  const places = report.sources.googlePlaces;
  if (places.status === "ok" || places.status === "partial") {
    if (places.data?.isMock) {
      concerns.push("Places returned MOCK — set GOOGLE_PLACES_API_KEY to validate match quality");
      score += 10;
    } else if (places.data?.matchConfidence === "high") {
      score += 30;
    } else if (places.data?.matchConfidence === "medium") {
      score += 20;
      concerns.push("Places match is medium confidence — verify firm before generating brief");
    } else {
      concerns.push("Places match is low/none — review count and rating may be unavailable");
      score += 5;
    }
  } else {
    concerns.push(`places failed: ${places.error ?? "unknown"}`);
  }

  const serp = report.sources.serpLocal;
  if (serp.status === "ok") {
    if (serp.data?.isMock) {
      concerns.push("SERP returned MOCK — set SERPAPI_KEY to validate competitor data");
      score += 10;
    } else {
      score += 30;
      if ((serp.data?.topLocalPackCompetitors.length ?? 0) === 0) {
        concerns.push("Empty local pack — competitor angle in brief will be weak");
      }
    }
  } else if (serp.status === "partial") {
    score += 15;
    concerns.push("SERP returned no local pack and no organic results");
  } else {
    concerns.push(`serp failed: ${serp.error ?? "unknown"}`);
  }

  return { score, concerns };
}

async function main() {
  const { firm, outFile } = parseArgs();
  const startedAt = new Date();
  const t0 = performance.now();

  const [siteScrape, googlePlaces, serpLocal] = await Promise.all([
    scrapeSite(firm),
    fetchPlaces(firm),
    fetchSerp(firm),
  ]);

  const sources = { siteScrape, googlePlaces, serpLocal };
  const { score, concerns } = computeCoverage({ sources });
  const completedAt = new Date();

  const report: ProbeReport = {
    firm,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totalMs: Math.round(performance.now() - t0),
    sources,
    coverageScore: score,
    briefInputReady: score >= 60,
    concerns,
  };

  const json = JSON.stringify(report, null, 2);
  if (outFile) {
    await writeFile(outFile, json, "utf-8");
    stdout.write(`Wrote ${outFile} (${json.length} bytes)\n`);
  }

  printSummary(report);
}

function printSummary(r: ProbeReport): void {
  const lines: string[] = [];
  lines.push("");
  lines.push("=".repeat(70));
  lines.push(`PROBE REPORT — ${r.firm.name}`);
  lines.push(`URL: ${r.firm.url}`);
  lines.push(`Market: ${r.firm.city}, ${r.firm.state}  •  Practice: ${r.firm.practiceArea}`);
  lines.push(`Total runtime: ${r.totalMs} ms`);
  lines.push(`Coverage score: ${r.coverageScore}/100   Brief-ready: ${r.briefInputReady ? "yes" : "no"}`);
  lines.push("=".repeat(70));

  const s = r.sources.siteScrape;
  lines.push(`\nSITE SCRAPE — ${s.status} (${Math.round(s.durationMs)} ms)`);
  if (s.error) lines.push(`  error: ${s.error}`);
  if (s.data) {
    lines.push(`  title: ${s.data.title ?? "(none)"}`);
    lines.push(`  H1s: ${s.data.h1s.slice(0, 2).join(" | ") || "(none)"}`);
    lines.push(`  phones: ${s.data.phoneNumbers.join(", ") || "(none)"}`);
    lines.push(
      `  intake signals: form=${s.data.hasContactForm} click-to-call=${s.data.hasClickToCallLink} booking=${s.data.hasOnlineBooking} chat=${s.data.hasLiveChat} mobile-viewport=${s.data.hasMobileViewport}`
    );
    lines.push(`  practice mentions: ${s.data.practiceAreaMentions.slice(0, 5).join(", ") || "(none)"}`);
    lines.push(`  trust signals: ${s.data.trustSignals.slice(0, 5).join(", ") || "(none)"}`);
    lines.push(`  schema types: ${s.data.schemaTypesFound.join(", ") || "(none)"}`);
    lines.push(`  CTAs: ${s.data.ctaTextSamples.slice(0, 4).join(" | ") || "(none)"}`);
    lines.push(`  attorneys: ${s.data.attorneyNameCandidates.slice(0, 3).join(", ") || "(none)"}`);
  }

  const p = r.sources.googlePlaces;
  lines.push(`\nGOOGLE PLACES — ${p.status} (${Math.round(p.durationMs)} ms)`);
  if (p.error) lines.push(`  error: ${p.error}`);
  if (p.data) {
    lines.push(`  match: ${p.data.matchConfidence} → ${p.data.matchedName ?? "(no match)"}${p.data.isMock ? " [MOCK]" : ""}`);
    if (p.data.formattedAddress) lines.push(`  address: ${p.data.formattedAddress}`);
    if (p.data.rating != null) lines.push(`  rating: ${p.data.rating} (${p.data.reviewCount ?? "?"} reviews)`);
  }

  const sr = r.sources.serpLocal;
  lines.push(`\nSERP — ${sr.status} (${Math.round(sr.durationMs)} ms)`);
  if (sr.error) lines.push(`  error: ${sr.error}`);
  if (sr.data) {
    lines.push(`  query: "${sr.data.query}"${sr.data.isMock ? " [MOCK]" : ""}`);
    lines.push(`  firm rank: local-pack=${sr.data.firmRankInLocalPack ?? "n/a"}, organic=${sr.data.firmRankInOrganic ?? "n/a"}`);
    if (sr.data.topLocalPackCompetitors.length) {
      lines.push(`  top local pack:`);
      for (const c of sr.data.topLocalPackCompetitors.slice(0, 3)) {
        lines.push(`    ${c.rank}. ${c.name}  ★${c.rating ?? "?"}  (${c.reviewCount ?? "?"} reviews)`);
      }
    }
  }

  if (r.concerns.length) {
    lines.push(`\nCONCERNS (${r.concerns.length}):`);
    r.concerns.forEach((c) => lines.push(`  • ${c}`));
  }
  lines.push("");
  stdout.write(lines.join("\n"));
}

main().catch((err) => {
  console.error("Fatal:", err);
  exit(2);
});
