import type { CallSession, PackageRecommendation, ProbeReport } from "../types";

/* Olson Law Office PC — matches the mockup designs */
export const MOCK_REPORT: ProbeReport = {
  firm: {
    name: "Olson Law Office PC",
    url: "https://greatfallscriminaldefenselawyers.com/",
    city: "Great Falls",
    state: "Montana",
    practiceArea: "criminal defense",
  },
  startedAt: "2026-05-04T14:00:00.000Z",
  completedAt: "2026-05-04T14:00:12.000Z",
  totalMs: 12000,
  sources: {
    siteScrape: {
      source: "site-scrape",
      status: "ok",
      durationMs: 3200,
      data: {
        fetchedUrl: "https://greatfallscriminaldefenselawyers.com/",
        finalUrl: "https://greatfallscriminaldefenselawyers.com/",
        httpStatus: 200,
        title: "Great Falls Criminal Defense Lawyers | Olson Law Office",
        metaDescription: "Experienced criminal defense attorneys serving Great Falls and Montana.",
        h1s: ["Great Falls Criminal Defense Lawyers"],
        h2s: ["Our Practice Areas", "Why Choose Us", "Contact Us Today"],
        phoneNumbers: ["(406) 555-0142"],
        emails: ["info@olsonlaw.example"],
        hasContactForm: true,
        hasOnlineBooking: false,
        hasLiveChat: false,
        hasMobileViewport: true,
        hasClickToCallLink: false,
        ctaTextSamples: ["Contact Us", "Free Consultation", "Call Now"],
        practiceAreaMentions: ["criminal defense", "dui", "dwi", "felony", "misdemeanor"],
        attorneyNameCandidates: ["James Olson"],
        schemaTypesFound: ["LegalService", "LocalBusiness"],
        reviewWidgetSignals: [],
        trustSignals: ["free consultation"],
        pageBytes: 185000,
        fetchMs: 3200,
        warnings: [],
      },
    },
    googlePlaces: {
      source: "google-places",
      status: "ok",
      durationMs: 800,
      data: {
        matchConfidence: "high",
        placeId: "ChIJexample123",
        matchedName: "Olson Law Office PC",
        formattedAddress: "123 Central Ave, Great Falls, MT 59401",
        rating: 5.0,
        reviewCount: 3,
        primaryCategory: "law_firm",
        categories: ["law_firm", "criminal_justice_attorney"],
        hasWebsite: true,
        hasHours: true,
        hasPhotos: false,
        isMock: false,
      },
    },
    serpLocal: {
      source: "serp-local",
      status: "ok",
      durationMs: 2100,
      data: {
        query: "criminal defense lawyer Great Falls Montana",
        firmRankInLocalPack: 3,
        firmRankInOrganic: 2,
        topLocalPackCompetitors: [
          { rank: 1, name: "Murphy Law Firm", rating: 4.8, reviewCount: 220, website: "https://murphylawmt.example" },
          { rank: 2, name: "Hoyt & Blewett PLLC", rating: 4.9, reviewCount: 145, website: "https://hoytblewett.example" },
          { rank: 3, name: "Olson Law Office PC", rating: 5.0, reviewCount: 3, website: "https://greatfallscriminaldefenselawyers.com/" },
          { rank: 4, name: "Dye & Tawney", rating: 4.7, reviewCount: 88, website: null },
          { rank: 5, name: "Alexander & Alexander", rating: 4.5, reviewCount: 64, website: null },
        ],
        topOrganicCompetitors: [
          { rank: 1, name: "Murphy Law Firm", rating: null, reviewCount: null, website: "https://murphylawmt.example" },
          { rank: 2, name: "Olson Law Office PC", rating: null, reviewCount: null, website: "https://greatfallscriminaldefenselawyers.com/" },
        ],
        isMock: false,
      },
    },
  },
  coverageScore: 70,
  briefInputReady: true,
  concerns: [
    "Only 3 Google reviews — local average is 54, top competitor has 220",
    "No click-to-call link — mobile users must copy/paste the number",
    "No live chat or online booking detected",
    "Review widget signals absent — no active review-generation strategy visible",
  ],
};

export const MOCK_RECOMMENDATION: PackageRecommendation = {
  primary: "rhea",
  primaryReasons: [
    "Moderate competitive market — top competitor (Murphy Law Firm) has 220 reviews. Rhea's bilingual content cadence (6 blogs, 4 videos, 4 FAQ voice blogs/mo) closes the gap.",
    "Review deficit of 217 vs. local leader — Rhea funds the geotargeted AI + voice search submissions needed to flank them.",
    "No trust signals detected — Rhea's content + PR cadence rebuilds authority.",
  ],
  addGravity: true,
  gravityReasons: [
    "Gravity bundled with Rhea unlocks the FREE-first-90-days promo ($599/mo after) — pure upside for the firm.",
    "Gravity layers in 100 local directories + 50 NAP POWER submissions + 3 GMB article posts/wk + 1 GMB video/mo that the SEO packages don't cover.",
    "Review gap vs. competition (217) closes faster with Gravity's GLSA + GMB posting cadence layered on top.",
  ],
  estimatedMonthly: 6598,
  estimatedFirstMonthBilled: 5999,
  alternatives: [
    { id: "lapetus", reason: "Down-tier option if Rhea is out of budget — still covers full SEO + PPC + LSA" },
    { id: "titan", reason: "If firm wants maximum volume and has budget for $8,999/mo + $100K ad spend" },
  ],
};

export const MOCK_SESSION: CallSession = {
  status: "active",
  objections: ["Too busy to handle more cases", "Cost of implementation"],
  closingTriggers: ["Legacy/Firm Reputation", "Dominating Great Falls market", "Automating Intake"],
  notes: `Olson J. — 14:22 PM\n"We need more high-ticket criminal cases. Local competitors are outspending us on 'Criminal Defense' keywords."\n\nSystem Alert — 14:35 PM\n"Criminal defense leads are high volume but conversion is lagging due to intake speed."`,
};
