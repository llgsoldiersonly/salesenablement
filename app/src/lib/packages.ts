import type { PackageId, PackageRecommendation, ProbeReport } from "../types/index.js";

/* Mirrors spike/probe/src/packages.ts. Keep these two in sync until we extract
 * a shared workspace package. The deterministic recommendation logic lives in
 * a single function so the React app and the brief generator agree on tier. */

export type PackageRole = "core" | "add-on" | "standalone-or-add-on";

export interface PackageDefinition {
  id: PackageId;
  name: string;
  tagline: string;
  role: PackageRole;
  monthlyFee: number;
  monthlyFeeNote?: string;
  chargedAtSigning: number;
  chargedAtSigningNote?: string;
  recommendedAdSpend: number | null;
  recommendedAdSpendNote?: string;
  cancellationPolicy: string;
  idealClientProfile: string;
  brandHex: string;
  bundledFreeWith?: PackageId[];
  addOnTo?: PackageId[];
  promos?: PackagePromo[];
}

export interface PackagePromo {
  description: string;
  appliesWhenBundledWith?: PackageId[];
  monthlyFeeDuringPromo?: number;
  monthlyFeeAfterPromo?: number;
  durationDays: number;
}

export const PACKAGES: Record<PackageId, PackageDefinition> = {
  "live-intakes": {
    id: "live-intakes",
    name: "Live Intakes",
    tagline: "Stand-Alone Add-On — 24/7 Bilingual Answering",
    role: "standalone-or-add-on",
    monthlyFee: 1999,
    chargedAtSigning: 17991,
    chargedAtSigningNote: "Full annual prepay (25% off — $17,991/yr)",
    recommendedAdSpend: null,
    cancellationPolicy: "30-day notice via email or phone to support@lucrativelegal.com",
    idealClientProfile: "Firms needing 24/7 bilingual intake coverage as a standalone add-on",
    brandHex: "#1FA0CF",
    bundledFreeWith: ["gravity", "lapetus", "rhea", "titan"],
  },
  gravity: {
    id: "gravity",
    name: "Gravity",
    tagline: "Local Spark — Maps / Citations / LSA",
    role: "standalone-or-add-on",
    monthlyFee: 1999,
    monthlyFeeNote: "Stays $1,999/mo when added on (sales rep can override)",
    chargedAtSigning: 0,
    chargedAtSigningNote: "$0 for 90 days, then $1,999/mo (when standalone)",
    recommendedAdSpend: null,
    recommendedAdSpendNote: "Client funds GLSA directly — no LLG mgmt fee",
    cancellationPolicy: "30-day written notice to legal@lucrativelegal.com",
    idealClientProfile: "Firms wanting an affordable local market entry via GMB, citations & GLSA",
    brandHex: "#2BAE9C",
    addOnTo: ["lapetus", "rhea", "titan"],
    promos: [
      {
        description: "FREE first 90 days, then $599/mo — only when bundled with Rhea or Titan",
        appliesWhenBundledWith: ["rhea", "titan"],
        monthlyFeeDuringPromo: 0,
        monthlyFeeAfterPromo: 599,
        durationDays: 90,
      },
    ],
  },
  lapetus: {
    id: "lapetus",
    name: "Lapetus",
    tagline: "Entry-Level — SEO / PPC / LSA",
    role: "core",
    monthlyFee: 3999,
    monthlyFeeNote: "No paid ads management fee",
    chargedAtSigning: 12998,
    chargedAtSigningNote: "1st & last ($7,998) + $5K ad hold",
    recommendedAdSpend: 5000,
    recommendedAdSpendNote: "Held as last-month reserve",
    cancellationPolicy: "30-day written notice to legal@lucrativelegal.com",
    idealClientProfile: "Solo practitioners or small firms entering digital lead gen with a modest budget",
    brandHex: "#E68A2E",
  },
  rhea: {
    id: "rhea",
    name: "Rhea",
    tagline: "Mid-Tier — SEO / PPC / LSA",
    role: "core",
    monthlyFee: 5999,
    monthlyFeeNote: "No paid ads management fee",
    chargedAtSigning: 21998,
    chargedAtSigningNote: "1st & last ($11,998) + $10K ad hold",
    recommendedAdSpend: 10000,
    recommendedAdSpendNote: "Held as last-month reserve",
    cancellationPolicy: "30-day written notice to legal@lucrativelegal.com",
    idealClientProfile: "Growing firms ready to scale with bilingual content + full ad campaigns",
    brandHex: "#C2362B",
  },
  titan: {
    id: "titan",
    name: "Titan",
    tagline: "Premium / Most Advanced — SEO / PPC / LSA",
    role: "core",
    monthlyFee: 8999,
    monthlyFeeNote: "No paid ads management fee",
    chargedAtSigning: 117998,
    chargedAtSigningNote: "1st & last ($17,998) + $100K ad hold",
    recommendedAdSpend: 100000,
    recommendedAdSpendNote: "Held as last-month reserve",
    cancellationPolicy: "30-day written notice; note 60-day setup period for TITAN",
    idealClientProfile: "High-volume firms seeking maximum market dominance",
    brandHex: "#5E2D8A",
  },
};

export const CORE_PACKAGES: PackageId[] = ["lapetus", "rhea", "titan"];

export function recommendPackage(report: ProbeReport): PackageRecommendation {
  const site = report.sources.siteScrape.data;
  const places = report.sources.googlePlaces.data;
  const serp = report.sources.serpLocal.data;

  const reviewCount = places?.reviewCount ?? 0;
  const competitorReviewMax =
    serp?.topLocalPackCompetitors.reduce((m, c) => Math.max(m, c.reviewCount ?? 0), 0) ?? 0;
  const reviewGap = Math.max(0, competitorReviewMax - reviewCount);

  const hasIntakeLeak =
    site != null && !site.hasContactForm && !site.hasClickToCallLink;
  const trustSignalCount = site?.trustSignals.length ?? 0;

  const practiceArea = report.firm.practiceArea.toLowerCase();
  const highStakesPractice =
    practiceArea.includes("mass tort") ||
    practiceArea.includes("class action") ||
    practiceArea.includes("medical malpractice");

  const heavyMarket = competitorReviewMax >= 500;
  const moderateMarket = competitorReviewMax >= 100 && competitorReviewMax < 500;
  const lightMarket = competitorReviewMax < 100;

  const primaryReasons: string[] = [];
  const gravityReasons: string[] = [];
  let primary: PackageId;

  if (highStakesPractice || heavyMarket) {
    primary = "titan";
    if (highStakesPractice)
      primaryReasons.push(
        `Practice area "${report.firm.practiceArea}" is high-stakes and warrants Titan-level SEO volume`
      );
    if (heavyMarket)
      primaryReasons.push(
        `Top local competitor has ${competitorReviewMax}+ reviews — only Titan's volume can dent that gap inside 12 months`
      );
  } else if (moderateMarket || reviewGap >= 75 || trustSignalCount === 0) {
    primary = "rhea";
    if (moderateMarket)
      primaryReasons.push(
        `Local pack leader sits at ${competitorReviewMax} reviews — Rhea's bilingual content cadence (6 blogs, 4 videos, 4 FAQ voice blogs/mo) closes the gap`
      );
    if (reviewGap >= 75)
      primaryReasons.push(
        `Review deficit of ${reviewGap} vs. local leader — Rhea funds the geotargeted AI + voice search submissions to flank them`
      );
    if (trustSignalCount === 0)
      primaryReasons.push(
        "No trust signals (Super Lawyers, Avvo, Best Lawyers) detected on homepage — Rhea's content + PR cadence rebuilds authority"
      );
  } else if (lightMarket && (hasIntakeLeak || (site?.h1s.length ?? 0) === 0)) {
    primary = "lapetus";
    if (hasIntakeLeak)
      primaryReasons.push(
        "Site has no contact form AND no click-to-call — Lapetus week-1 deliverables include intake software install"
      );
    if ((site?.h1s.length ?? 0) === 0)
      primaryReasons.push(
        "Homepage has no H1 — Lapetus's 20 optimized inner pages + on-page SEO pass fixes architecture from day one"
      );
  } else if (lightMarket) {
    primary = "gravity";
    primaryReasons.push(
      `Light competitive market (top competitor at ${competitorReviewMax} reviews) — Gravity standalone is the right on-ramp`
    );
    primaryReasons.push(
      "Gravity's 100 NAP directories + 50 NAP POWER submissions + 3 GMB posts/wk dominate a low-density market"
    );
  } else {
    primary = "lapetus";
    primaryReasons.push(
      "Default entry-level recommendation — Lapetus covers full SEO + PPC + LSA at the lowest core-tier price"
    );
  }

  const isCore = CORE_PACKAGES.includes(primary);
  const addGravity =
    isCore &&
    (primary === "rhea" || primary === "titan" || (primary === "lapetus" && lightMarket));

  if (addGravity) {
    if (primary === "rhea" || primary === "titan") {
      gravityReasons.push(
        "Bundled with Rhea/Titan unlocks the FREE-first-90-days promo ($599/mo after) — pure upside"
      );
    }
    gravityReasons.push(
      "Gravity layers in 100 directories + 50 NAP POWER + 3 GMB posts/wk + 1 GMB video/mo that the SEO packages don't cover"
    );
    if (reviewGap > 0) {
      gravityReasons.push(
        `Review gap (${reviewGap}) closes faster with Gravity's GLSA + GMB cadence layered on top`
      );
    }
  }

  const primaryDef = PACKAGES[primary];
  const gravityDef = PACKAGES.gravity;
  let estimatedMonthly = primaryDef.monthlyFee;
  let estimatedFirstMonthBilled = primaryDef.monthlyFee;

  if (addGravity) {
    const promo = gravityDef.promos?.find((p) =>
      p.appliesWhenBundledWith?.includes(primary)
    );
    if (promo && promo.monthlyFeeDuringPromo === 0) {
      estimatedMonthly = primaryDef.monthlyFee + (promo.monthlyFeeAfterPromo ?? 0);
      estimatedFirstMonthBilled = primaryDef.monthlyFee;
    } else {
      estimatedMonthly = primaryDef.monthlyFee + gravityDef.monthlyFee;
      estimatedFirstMonthBilled = estimatedMonthly;
    }
  }

  const alternatives: { id: PackageId; reason: string }[] = [];
  if (primary !== "rhea" && primary !== "titan") {
    alternatives.push({
      id: "rhea",
      reason: "If firm has budget for $5,999/mo + $10K ad spend and wants bilingual content scale",
    });
  }
  if (primary !== "lapetus" && primary !== "gravity") {
    alternatives.push({
      id: "lapetus",
      reason: "Down-tier option if Rhea/Titan is out of budget — still covers full SEO + PPC + LSA",
    });
  }
  if (primary !== "gravity" && !addGravity) {
    alternatives.push({
      id: "gravity",
      reason: "Add-on or downgrade option if firm wants a local-only pilot first",
    });
  }

  return {
    primary,
    primaryReasons,
    addGravity,
    gravityReasons,
    estimatedMonthly,
    estimatedFirstMonthBilled,
    alternatives,
  };
}

export function formatUsd(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}
