import * as cheerio from "cheerio";
import type { FirmInput, SiteScrapeData, SourceResult } from "../../src/types";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 2_500_000;

const PRACTICE_AREA_TERMS = [
  "personal injury", "car accident", "auto accident", "truck accident",
  "motorcycle accident", "wrongful death", "medical malpractice",
  "family law", "divorce", "child custody", "child support",
  "criminal defense", "dui", "dwi", "felony", "misdemeanor",
  "immigration", "deportation", "asylum", "green card", "visa",
  "estate planning", "wills", "trusts", "probate",
  "bankruptcy", "chapter 7", "chapter 13",
  "workers compensation", "workers' comp",
  "employment law", "discrimination", "wrongful termination",
  "business law", "contracts", "litigation",
  "mass tort", "class action",
];

const TRUST_SIGNAL_TERMS = [
  "super lawyers", "avvo", "best lawyers", "martindale",
  "million dollar advocates", "multi-million dollar",
  "board certified", "trial lawyer", "free consultation",
  "no fee unless we win", "no fee unless you win",
  "5 star", "five star", "google reviews",
];

const CTA_KEYWORDS = [
  "call", "schedule", "consult", "free", "contact",
  "case review", "speak", "book", "request", "talk",
];

const BOOKING_HINTS = ["calendly.com", "acuity", "schedule a", "book a", "book your"];
const CHAT_HINTS = ["intercom", "drift", "tawk", "tidio", "livechatinc", "olark", "podium", "ngage", "ngagelive", "smartchat"];
const REVIEW_HINTS = ["google reviews", "g.page", "trustpilot", "yelp", "birdeye", "podium", "grade.us", "shopperapproved"];

function extractPhones(text: string): string[] {
  const re = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
  const matches = text.match(re) ?? [];
  return Array.from(new Set(matches.map((m) => m.trim()))).slice(0, 5);
}

function extractEmails(text: string): string[] {
  const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(re) ?? [];
  return Array.from(
    new Set(
      matches
        .map((m) => m.toLowerCase())
        .filter((m) => !m.endsWith(".png") && !m.endsWith(".jpg") && !m.endsWith(".webp"))
    )
  ).slice(0, 5);
}

function extractAttorneyCandidates($: cheerio.CheerioAPI): string[] {
  const out = new Set<string>();
  $('[class*="attorney" i], [class*="lawyer" i], [class*="team" i]').each((_, el) => {
    const text = $(el).text().trim();
    const nameMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\b/);
    if (nameMatch) out.add(nameMatch[1]);
  });
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    const m = text.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(?:Esq|Attorney|Lawyer|J\.?D\.?)/);
    if (m) out.add(m[1]);
  });
  return Array.from(out).slice(0, 8);
}

function extractSchemaTypes($: cheerio.CheerioAPI): string[] {
  const types = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const t = (item as Record<string, unknown>)["@type"];
        if (typeof t === "string") types.add(t);
        else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x));
        const graph = (item as Record<string, unknown>)["@graph"];
        if (Array.isArray(graph)) {
          for (const g of graph) {
            const gt = (g as Record<string, unknown>)["@type"];
            if (typeof gt === "string") types.add(gt);
            else if (Array.isArray(gt)) gt.forEach((x) => typeof x === "string" && types.add(x));
          }
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  });
  return Array.from(types);
}

function findCtaSamples($: cheerio.CheerioAPI): string[] {
  const out = new Set<string>();
  $('a, button').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (!text || text.length > 60 || text.length < 3) return;
    const lower = text.toLowerCase();
    if (CTA_KEYWORDS.some((k) => lower.includes(k))) out.add(text);
  });
  return Array.from(out).slice(0, 12);
}

async function fetchWithLimits(
  url: string,
): Promise<{ html: string; status: number; finalUrl: string; bytes: number; ms: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = performance.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: controller.signal,
    });
    const buf = await res.arrayBuffer();
    const bytes = buf.byteLength;
    if (bytes > MAX_BYTES) {
      throw new Error(`Response too large: ${bytes} bytes`);
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return { html, status: res.status, finalUrl: res.url, bytes, ms: performance.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

interface ParseInput {
  html: string;
  fetchedUrl: string;
  finalUrl: string;
  httpStatus: number;
  bytes: number;
  fetchMs: number;
}

function parseSiteHtml(input: ParseInput): SiteScrapeData {
  const warnings: string[] = [];
  const $ = cheerio.load(input.html);
  const visibleText = $("body").text().replace(/\s+/g, " ").toLowerCase();
  const hrefBlob = $("a[href]").map((_, el) => $(el).attr("href") ?? "").get().join(" ").toLowerCase();
  const scriptBlob = $("script").map((_, el) => $(el).attr("src") ?? "").get().join(" ").toLowerCase();
  const haystack = `${hrefBlob} ${scriptBlob} ${visibleText}`;

  const phoneNumbers = extractPhones(visibleText + " " + hrefBlob);
  const emails = extractEmails($("body").html() ?? "");

  const hasMobileViewport = $('meta[name="viewport"]').length > 0;
  const hasClickToCallLink = /href=["']tel:/i.test(input.html);
  const hasContactForm =
    $("form").length > 0 ||
    /<form/i.test(input.html) ||
    /hbspt\.forms|gravityforms|wpforms|ninja_forms|formstack|jotform/.test(haystack);
  const hasOnlineBooking = BOOKING_HINTS.some((h) => haystack.includes(h));
  const hasLiveChat = CHAT_HINTS.some((h) => haystack.includes(h));

  const practiceAreaMentions = PRACTICE_AREA_TERMS.filter((t) => visibleText.includes(t));
  const trustSignals = TRUST_SIGNAL_TERMS.filter((t) => visibleText.includes(t));
  const reviewWidgetSignals = REVIEW_HINTS.filter((t) => haystack.includes(t));

  const h1s = $("h1").map((_, el) => $(el).text().trim().replace(/\s+/g, " ")).get().filter(Boolean).slice(0, 5);
  const h2s = $("h2").map((_, el) => $(el).text().trim().replace(/\s+/g, " ")).get().filter(Boolean).slice(0, 10);

  if (visibleText.length < 400) warnings.push("Very short visible text — site may be JS-rendered");
  if (h1s.length === 0) warnings.push("No H1 tag found");
  if (phoneNumbers.length === 0) warnings.push("No phone number detected on homepage");

  return {
    fetchedUrl: input.fetchedUrl,
    finalUrl: input.finalUrl,
    httpStatus: input.httpStatus,
    title: $("title").first().text().trim() || null,
    metaDescription: $('meta[name="description"]').attr("content")?.trim() ?? null,
    h1s,
    h2s,
    phoneNumbers,
    emails,
    hasContactForm,
    hasOnlineBooking,
    hasLiveChat,
    hasMobileViewport,
    hasClickToCallLink,
    ctaTextSamples: findCtaSamples($),
    practiceAreaMentions,
    attorneyNameCandidates: extractAttorneyCandidates($),
    schemaTypesFound: extractSchemaTypes($),
    reviewWidgetSignals,
    trustSignals,
    pageBytes: input.bytes,
    fetchMs: Math.round(input.fetchMs),
    warnings,
  };
}

export async function scrapeSite(firm: FirmInput): Promise<SourceResult<SiteScrapeData>> {
  const start = performance.now();
  let url = firm.url.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  try {
    const { html, status, finalUrl, bytes, ms } = await fetchWithLimits(url);
    if (status >= 400) {
      return {
        source: "site-scrape",
        status: "failed",
        durationMs: performance.now() - start,
        data: null,
        error: `HTTP ${status}`,
      };
    }

    const data = parseSiteHtml({
      html,
      fetchedUrl: url,
      finalUrl,
      httpStatus: status,
      bytes,
      fetchMs: ms,
    });

    return {
      source: "site-scrape",
      status: data.warnings.length > 1 ? "partial" : "ok",
      durationMs: performance.now() - start,
      data,
      notes: data.warnings.length ? data.warnings : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      source: "site-scrape",
      status: "failed",
      durationMs: performance.now() - start,
      data: null,
      error: msg,
    };
  }
}
