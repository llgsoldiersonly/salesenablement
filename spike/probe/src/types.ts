export interface FirmInput {
  name: string;
  url: string;
  city: string;
  state: string;
  practiceArea: string;
}

export type SourceStatus = "ok" | "partial" | "failed" | "skipped";

export interface SourceResult<T> {
  source: string;
  status: SourceStatus;
  durationMs: number;
  data: T | null;
  error?: string;
  notes?: string[];
}

export interface SiteScrapeData {
  fetchedUrl: string;
  finalUrl: string;
  httpStatus: number;
  title: string | null;
  metaDescription: string | null;
  h1s: string[];
  h2s: string[];
  phoneNumbers: string[];
  emails: string[];
  hasContactForm: boolean;
  hasOnlineBooking: boolean;
  hasLiveChat: boolean;
  hasMobileViewport: boolean;
  hasClickToCallLink: boolean;
  ctaTextSamples: string[];
  practiceAreaMentions: string[];
  attorneyNameCandidates: string[];
  schemaTypesFound: string[];
  reviewWidgetSignals: string[];
  trustSignals: string[];
  pageBytes: number;
  fetchMs: number;
  warnings: string[];
}

export interface PlacesData {
  matchConfidence: "high" | "medium" | "low" | "none";
  placeId: string | null;
  matchedName: string | null;
  formattedAddress: string | null;
  rating: number | null;
  reviewCount: number | null;
  primaryCategory: string | null;
  categories: string[];
  hasWebsite: boolean;
  hasHours: boolean;
  hasPhotos: boolean;
  isMock: boolean;
}

export interface SerpCompetitor {
  rank: number;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
}

export interface SerpData {
  query: string;
  firmRankInLocalPack: number | null;
  firmRankInOrganic: number | null;
  topLocalPackCompetitors: SerpCompetitor[];
  topOrganicCompetitors: SerpCompetitor[];
  isMock: boolean;
}

export interface ProbeReport {
  firm: FirmInput;
  startedAt: string;
  completedAt: string;
  totalMs: number;
  sources: {
    siteScrape: SourceResult<SiteScrapeData>;
    googlePlaces: SourceResult<PlacesData>;
    serpLocal: SourceResult<SerpData>;
  };
  coverageScore: number;
  briefInputReady: boolean;
  concerns: string[];
}
