import type { FirmInput, PlacesData, SourceResult } from "../types.ts";

const PLACES_FIND_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";

const FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.primaryType",
  "places.types",
  "places.websiteUri",
  "places.regularOpeningHours",
  "places.photos",
].join(",");

function mockResult(firm: FirmInput): SourceResult<PlacesData> {
  return {
    source: "google-places",
    status: "ok",
    durationMs: 0,
    data: {
      matchConfidence: "medium",
      placeId: `MOCK_${Buffer.from(firm.name).toString("hex").slice(0, 12)}`,
      matchedName: firm.name,
      formattedAddress: `123 Main St, ${firm.city}, ${firm.state}`,
      rating: 4.4,
      reviewCount: 87,
      primaryCategory: "law_firm",
      categories: ["law_firm", "legal_services"],
      hasWebsite: true,
      hasHours: true,
      hasPhotos: true,
      isMock: true,
    },
    notes: ["MOCK DATA — set GOOGLE_PLACES_API_KEY to hit the real API"],
  };
}

function classifyConfidence(
  matchedName: string | null,
  matchedAddress: string | null,
  firm: FirmInput
): "high" | "medium" | "low" | "none" {
  if (!matchedName) return "none";
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const a = norm(matchedName);
  const b = norm(firm.name);
  const cityHit = matchedAddress ? norm(matchedAddress).includes(norm(firm.city)) : false;
  if (a === b && cityHit) return "high";
  if ((a.includes(b) || b.includes(a)) && cityHit) return "high";
  if (cityHit) return "medium";
  return "low";
}

export async function fetchPlaces(firm: FirmInput): Promise<SourceResult<PlacesData>> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return mockResult(firm);

  const start = performance.now();
  try {
    const res = await fetch(PLACES_FIND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELDS,
      },
      body: JSON.stringify({
        textQuery: `${firm.name} ${firm.city} ${firm.state}`,
        maxResultCount: 1,
        includedType: "lawyer",
      }),
    });
    if (!res.ok) {
      return {
        source: "google-places",
        status: "failed",
        durationMs: performance.now() - start,
        data: null,
        error: `HTTP ${res.status}: ${await res.text().catch(() => "")}`,
      };
    }
    const json = (await res.json()) as { places?: Array<Record<string, unknown>> };
    const place = json.places?.[0];
    if (!place) {
      return {
        source: "google-places",
        status: "ok",
        durationMs: performance.now() - start,
        data: {
          matchConfidence: "none",
          placeId: null,
          matchedName: null,
          formattedAddress: null,
          rating: null,
          reviewCount: null,
          primaryCategory: null,
          categories: [],
          hasWebsite: false,
          hasHours: false,
          hasPhotos: false,
          isMock: false,
        },
        notes: ["No Places match found for this firm"],
      };
    }

    const displayName = (place.displayName as { text?: string } | undefined)?.text ?? null;
    const formattedAddress = (place.formattedAddress as string | undefined) ?? null;
    const data: PlacesData = {
      matchConfidence: classifyConfidence(displayName, formattedAddress, firm),
      placeId: (place.id as string | undefined) ?? null,
      matchedName: displayName,
      formattedAddress,
      rating: (place.rating as number | undefined) ?? null,
      reviewCount: (place.userRatingCount as number | undefined) ?? null,
      primaryCategory: (place.primaryType as string | undefined) ?? null,
      categories: (place.types as string[] | undefined) ?? [],
      hasWebsite: typeof place.websiteUri === "string",
      hasHours: place.regularOpeningHours != null,
      hasPhotos: Array.isArray(place.photos) && (place.photos as unknown[]).length > 0,
      isMock: false,
    };
    return {
      source: "google-places",
      status: data.matchConfidence === "low" || data.matchConfidence === "none" ? "partial" : "ok",
      durationMs: performance.now() - start,
      data,
    };
  } catch (err) {
    return {
      source: "google-places",
      status: "failed",
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
