import type { FirmInput, SerpCompetitor, SerpData, SourceResult } from "../../src/types";

const SERPAPI_URL = "https://serpapi.com/search.json";

function mockResult(firm: FirmInput): SourceResult<SerpData> {
  const query = `${firm.practiceArea} lawyer ${firm.city} ${firm.state}`;
  const mockCompetitors: SerpCompetitor[] = [
    { rank: 1, name: "Morgan & Morgan", rating: 4.7, reviewCount: 1284, website: "https://forthepeople.com" },
    { rank: 2, name: "Local Heavy Hitter LLC", rating: 4.9, reviewCount: 412, website: null },
    { rank: 3, name: "Smith Law Group", rating: 4.5, reviewCount: 187, website: null },
  ];
  return {
    source: "serp-local",
    status: "ok",
    durationMs: 0,
    data: {
      query,
      firmRankInLocalPack: null,
      firmRankInOrganic: null,
      topLocalPackCompetitors: mockCompetitors,
      topOrganicCompetitors: mockCompetitors,
      isMock: true,
    },
    notes: ["MOCK DATA — set SERPAPI_KEY to hit the real API"],
  };
}

function findFirmRank(
  results: Array<{ title?: string; link?: string }>,
  firm: FirmInput,
): number | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const targetName = norm(firm.name);
  const firmHost = (() => {
    try {
      return new URL(firm.url.startsWith("http") ? firm.url : `https://${firm.url}`).hostname.replace(
        /^www\./,
        "",
      );
    } catch {
      return null;
    }
  })();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const titleHit = r.title ? norm(r.title).includes(targetName) : false;
    const linkHit = r.link && firmHost ? r.link.includes(firmHost) : false;
    if (titleHit || linkHit) return i + 1;
  }
  return null;
}

export async function fetchSerp(firm: FirmInput): Promise<SourceResult<SerpData>> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return mockResult(firm);

  const start = performance.now();
  const query = `${firm.practiceArea} lawyer ${firm.city} ${firm.state}`;
  const params = new URLSearchParams({
    engine: "google",
    q: query,
    location: `${firm.city}, ${firm.state}, United States`,
    google_domain: "google.com",
    gl: "us",
    hl: "en",
    api_key: apiKey,
  });

  try {
    const res = await fetch(`${SERPAPI_URL}?${params.toString()}`);
    if (!res.ok) {
      return {
        source: "serp-local",
        status: "failed",
        durationMs: performance.now() - start,
        data: null,
        error: `HTTP ${res.status}`,
      };
    }
    const json = (await res.json()) as {
      organic_results?: Array<{ title?: string; link?: string; position?: number }>;
      local_results?: { places?: Array<{ title?: string; rating?: number; reviews?: number; website?: string }> };
    };

    const local = json.local_results?.places ?? [];
    const organic = json.organic_results ?? [];

    const localCompetitors: SerpCompetitor[] = local.slice(0, 5).map((p, i) => ({
      rank: i + 1,
      name: p.title ?? "(unnamed)",
      rating: p.rating ?? null,
      reviewCount: p.reviews ?? null,
      website: p.website ?? null,
    }));
    const organicCompetitors: SerpCompetitor[] = organic.slice(0, 10).map((r, i) => ({
      rank: r.position ?? i + 1,
      name: r.title ?? "(untitled)",
      rating: null,
      reviewCount: null,
      website: r.link ?? null,
    }));

    const data: SerpData = {
      query,
      firmRankInLocalPack: findFirmRank(local.map((p) => ({ title: p.title, link: p.website })), firm),
      firmRankInOrganic: findFirmRank(organic.map((r) => ({ title: r.title, link: r.link })), firm),
      topLocalPackCompetitors: localCompetitors,
      topOrganicCompetitors: organicCompetitors,
      isMock: false,
    };

    return {
      source: "serp-local",
      status: localCompetitors.length === 0 && organicCompetitors.length === 0 ? "partial" : "ok",
      durationMs: performance.now() - start,
      data,
    };
  } catch (err) {
    return {
      source: "serp-local",
      status: "failed",
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
