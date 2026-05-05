import { readFile, writeFile, mkdir } from "node:fs/promises";
import { argv, exit, stdout } from "node:process";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { scrapeSite } from "./sources/site-scrape.ts";
import { fetchPlaces } from "./sources/places.ts";
import { fetchSerp } from "./sources/serp.ts";
import type { FirmInput, ProbeReport } from "./types.ts";

interface BatchArgs {
  inputCsv: string;
  outDir: string;
  concurrency: number;
}

function parseBatchArgs(): BatchArgs {
  const args = argv.slice(2);
  let inputCsv = "test-data/sample-firms.csv";
  let outDir = "test-data/runs";
  let concurrency = 3;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--in" && args[i + 1]) inputCsv = args[++i];
    else if (a === "--out" && args[i + 1]) outDir = args[++i];
    else if (a === "--concurrency" && args[i + 1]) concurrency = Number(args[++i]) || 3;
  }
  return { inputCsv, outDir, concurrency };
}

async function probeFirm(firm: FirmInput): Promise<ProbeReport> {
  const startedAt = new Date();
  const t0 = performance.now();
  const [siteScrape, googlePlaces, serpLocal] = await Promise.all([
    scrapeSite(firm),
    fetchPlaces(firm),
    fetchSerp(firm),
  ]);
  const concerns: string[] = [];
  let score = 0;
  if (siteScrape.status !== "failed") score += 40;
  else concerns.push(`site: ${siteScrape.error}`);
  if (googlePlaces.status !== "failed") {
    score += googlePlaces.data?.isMock ? 10 : googlePlaces.data?.matchConfidence === "high" ? 30 : 15;
  } else {
    concerns.push(`places: ${googlePlaces.error}`);
  }
  if (serpLocal.status !== "failed") score += serpLocal.data?.isMock ? 10 : 30;
  else concerns.push(`serp: ${serpLocal.error}`);

  return {
    firm,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    totalMs: Math.round(performance.now() - t0),
    sources: { siteScrape, googlePlaces, serpLocal },
    coverageScore: score,
    briefInputReady: score >= 60,
    concerns,
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

async function main(): Promise<void> {
  const { inputCsv, outDir, concurrency } = parseBatchArgs();
  const raw = await readFile(inputCsv, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as Array<
    Record<string, string>
  >;
  const firms: FirmInput[] = rows.map((r) => ({
    name: r.name,
    url: r.url,
    city: r.city,
    state: r.state,
    practiceArea: r.practice_area || r.practiceArea,
  }));

  if (firms.length === 0) {
    stdout.write(`No firms in ${inputCsv}\n`);
    exit(1);
  }

  await mkdir(outDir, { recursive: true });
  stdout.write(`Probing ${firms.length} firms with concurrency=${concurrency}...\n`);

  const reports = await runWithConcurrency(firms, concurrency, async (firm, i) => {
    stdout.write(`  [${i + 1}/${firms.length}] ${firm.name}...\n`);
    const report = await probeFirm(firm);
    const file = `${outDir}/${String(i + 1).padStart(2, "0")}-${slugify(firm.name)}.json`;
    await writeFile(file, JSON.stringify(report, null, 2), "utf-8");
    return report;
  });

  const summaryRows = reports.map((r) => ({
    firm: r.firm.name,
    url: r.firm.url,
    market: `${r.firm.city}, ${r.firm.state}`,
    practice: r.firm.practiceArea,
    total_ms: r.totalMs,
    coverage_score: r.coverageScore,
    brief_ready: r.briefInputReady ? "yes" : "no",
    site_status: r.sources.siteScrape.status,
    site_phone_count: r.sources.siteScrape.data?.phoneNumbers.length ?? 0,
    site_has_form: r.sources.siteScrape.data?.hasContactForm ?? false,
    site_has_click_to_call: r.sources.siteScrape.data?.hasClickToCallLink ?? false,
    site_warnings: r.sources.siteScrape.data?.warnings.length ?? 0,
    places_status: r.sources.googlePlaces.status,
    places_match: r.sources.googlePlaces.data?.matchConfidence ?? "n/a",
    places_rating: r.sources.googlePlaces.data?.rating ?? "",
    places_reviews: r.sources.googlePlaces.data?.reviewCount ?? "",
    places_mock: r.sources.googlePlaces.data?.isMock ?? false,
    serp_status: r.sources.serpLocal.status,
    serp_local_pack_count: r.sources.serpLocal.data?.topLocalPackCompetitors.length ?? 0,
    serp_firm_rank_local: r.sources.serpLocal.data?.firmRankInLocalPack ?? "",
    serp_mock: r.sources.serpLocal.data?.isMock ?? false,
    concerns: r.concerns.join("; "),
  }));
  const csv = stringify(summaryRows, { header: true });
  await writeFile(`${outDir}/coverage-summary.csv`, csv, "utf-8");

  const briefReady = reports.filter((r) => r.briefInputReady).length;
  const failedSite = reports.filter((r) => r.sources.siteScrape.status === "failed").length;
  const avgMs = Math.round(reports.reduce((a, r) => a + r.totalMs, 0) / reports.length);
  const p95Ms = reports.map((r) => r.totalMs).sort((a, b) => a - b)[Math.floor(reports.length * 0.95)];

  stdout.write(`\nDONE. Results in ${outDir}/\n`);
  stdout.write(`  Total: ${reports.length}\n`);
  stdout.write(`  Brief-ready: ${briefReady}/${reports.length} (${Math.round((briefReady / reports.length) * 100)}%)\n`);
  stdout.write(`  Site scrapes failed: ${failedSite}/${reports.length}\n`);
  stdout.write(`  Avg runtime: ${avgMs} ms   p95: ${p95Ms} ms\n`);
  stdout.write(`  Per-firm reports: ${outDir}/NN-firm-name.json\n`);
  stdout.write(`  Summary: ${outDir}/coverage-summary.csv\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  exit(2);
});
