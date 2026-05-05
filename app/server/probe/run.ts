/**
 * Orchestrator: runs the three probe sources in parallel and emits NDJSON
 * progress events as each one finishes. Computes coverage score the same way
 * the spike CLI does.
 */

import { scrapeSite } from "./site-scrape.js";
import { fetchPlaces } from "./places.js";
import { fetchSerp } from "./serp.js";
import type { FirmInput, ProbeReport, SourceResult } from "../../src/types/index.js";

export interface ProbeStepEvent {
  type: "step";
  source: "site-scrape" | "google-places" | "serp-local";
  status: "running" | "ok" | "partial" | "failed" | "skipped";
  durationMs?: number;
  notes?: string[];
  error?: string;
}

export interface ProbeReportEvent {
  type: "report";
  report: ProbeReport;
}

export interface ProbeErrorEvent {
  type: "error";
  message: string;
}

export interface ProbeDoneEvent {
  type: "done";
}

export type ProbeEvent = ProbeStepEvent | ProbeReportEvent | ProbeErrorEvent | ProbeDoneEvent;

function computeCoverage(sources: ProbeReport["sources"]): { score: number; concerns: string[] } {
  const concerns: string[] = [];
  let score = 0;

  const site = sources.siteScrape;
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

  const places = sources.googlePlaces;
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

  const serp = sources.serpLocal;
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

function stepFromResult(
  source: ProbeStepEvent["source"],
  result: SourceResult<unknown>,
): ProbeStepEvent {
  return {
    type: "step",
    source,
    status: result.status,
    durationMs: Math.round(result.durationMs),
    notes: result.notes,
    error: result.error,
  };
}

/**
 * Runs the probe and yields events: 3× "running", 3× "ok|partial|failed",
 * one "report", then "done". Uses Promise.all under the hood so the three
 * sources run concurrently — but events are emitted in completion order
 * via Promise.race so the UI shows live progress.
 */
export async function* runProbe(firm: FirmInput): AsyncGenerator<ProbeEvent> {
  const startedAt = new Date();
  const t0 = performance.now();

  // Announce all three are starting
  yield { type: "step", source: "site-scrape", status: "running" };
  yield { type: "step", source: "google-places", status: "running" };
  yield { type: "step", source: "serp-local", status: "running" };

  type Tagged =
    | { tag: "siteScrape"; result: SourceResult<unknown> }
    | { tag: "googlePlaces"; result: SourceResult<unknown> }
    | { tag: "serpLocal"; result: SourceResult<unknown> };

  const tagSource: Record<Tagged["tag"], ProbeStepEvent["source"]> = {
    siteScrape: "site-scrape",
    googlePlaces: "google-places",
    serpLocal: "serp-local",
  };

  const pending = new Map<Tagged["tag"], Promise<Tagged>>();
  pending.set(
    "siteScrape",
    scrapeSite(firm).then((result) => ({ tag: "siteScrape" as const, result })),
  );
  pending.set(
    "googlePlaces",
    fetchPlaces(firm).then((result) => ({ tag: "googlePlaces" as const, result })),
  );
  pending.set(
    "serpLocal",
    fetchSerp(firm).then((result) => ({ tag: "serpLocal" as const, result })),
  );

  const results: Partial<Record<Tagged["tag"], SourceResult<unknown>>> = {};

  while (pending.size > 0) {
    const winner = await Promise.race(pending.values());
    pending.delete(winner.tag);
    results[winner.tag] = winner.result;
    yield stepFromResult(tagSource[winner.tag], winner.result);
  }

  const sources = {
    siteScrape: results.siteScrape! as ProbeReport["sources"]["siteScrape"],
    googlePlaces: results.googlePlaces! as ProbeReport["sources"]["googlePlaces"],
    serpLocal: results.serpLocal! as ProbeReport["sources"]["serpLocal"],
  };

  const { score, concerns } = computeCoverage(sources);
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

  yield { type: "report", report };
  yield { type: "done" };
}
