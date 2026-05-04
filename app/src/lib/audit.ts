import type { ProbeReport } from "../types";

export interface AuditMetric {
  id: string;
  label: string;
  score: number;     // 0–100
  weight: number;
  value: string;     // human-readable current value
  tip: string | null; // null = passing, string = actionable fix
}

export interface AuditCategory {
  id: string;
  label: string;
  icon: string;
  weight: number;
  score: number; // weighted roll-up 0–100
  metrics: AuditMetric[];
}

export interface AuditResult {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  categories: AuditCategory[];
}

function rollUp(metrics: AuditMetric[]): number {
  const totalWeight = metrics.reduce((s, m) => s + m.weight, 0);
  if (totalWeight === 0) return 0;
  return metrics.reduce((s, m) => s + m.score * m.weight, 0) / totalWeight;
}

export function buildAudit(report: ProbeReport): AuditResult {
  const site = report.sources.siteScrape.data;
  const places = report.sources.googlePlaces.data;
  const serp = report.sources.serpLocal.data;

  /* ── SEO & Content ───────────────────────────────────────────────── */
  const seoMetrics: AuditMetric[] = [
    {
      id: "title",
      label: "Page Title",
      weight: 2,
      score: site?.title ? 100 : 0,
      value: site?.title ? `"${site.title.substring(0, 48)}${site.title.length > 48 ? "…" : ""}"` : "Missing",
      tip: site?.title
        ? null
        : `Add a keyword-rich title tag targeting "${report.firm.practiceArea} attorney ${report.firm.city} ${report.firm.state}".`,
    },
    {
      id: "h1",
      label: "H1 Heading",
      weight: 2,
      score: (site?.h1s?.length ?? 0) > 0 ? 100 : 0,
      value: site?.h1s?.[0] ? `"${site.h1s[0].substring(0, 48)}${site.h1s[0].length > 48 ? "…" : ""}"` : "None found",
      tip: (site?.h1s?.length ?? 0) > 0
        ? null
        : "No H1 tag detected. Add one clearly-named heading per page targeting your primary practice area and city.",
    },
    {
      id: "meta-desc",
      label: "Meta Description",
      weight: 1.5,
      score: site?.metaDescription ? 100 : 0,
      value: site?.metaDescription
        ? `${site.metaDescription.substring(0, 50)}…`
        : "Missing",
      tip: site?.metaDescription
        ? null
        : "No meta description. Write a 150–160 char summary with a clear CTA — it's your organic ad copy.",
    },
    {
      id: "schema",
      label: "Structured Data (Schema.org)",
      weight: 2,
      score: Math.min((site?.schemaTypesFound?.length ?? 0) * 25, 100),
      value: (site?.schemaTypesFound?.length ?? 0) > 0 ? site!.schemaTypesFound.join(", ") : "None detected",
      tip:
        (site?.schemaTypesFound?.length ?? 0) >= 2
          ? null
          : "Add LocalBusiness and Attorney schema markup. We deploy this automatically in every package.",
    },
    {
      id: "practice-mentions",
      label: "Practice Area Mentions",
      weight: 1,
      score: Math.min((site?.practiceAreaMentions?.length ?? 0) * 20, 100),
      value: `${site?.practiceAreaMentions?.length ?? 0} mentions`,
      tip:
        (site?.practiceAreaMentions?.length ?? 0) >= 3
          ? null
          : `"${report.firm.practiceArea}" barely appears on the page. Add targeted content and FAQs to signal relevance to Google.`,
    },
  ];
  const seoCategory: AuditCategory = {
    id: "seo",
    label: "SEO & Content",
    icon: "🔍",
    weight: 0.3,
    score: rollUp(seoMetrics),
    metrics: seoMetrics,
  };

  /* ── Intake & Conversion ─────────────────────────────────────────── */
  const intakeMetrics: AuditMetric[] = [
    {
      id: "contact-form",
      label: "Contact Form",
      weight: 3,
      score: site?.hasContactForm ? 100 : 0,
      value: site?.hasContactForm ? "Present" : "Missing",
      tip: site?.hasContactForm
        ? null
        : "No contact form detected. This is the #1 conversion barrier for law firm sites.",
    },
    {
      id: "click-to-call",
      label: "Click-to-Call (Mobile)",
      weight: 3,
      score: site?.hasClickToCallLink ? 100 : 0,
      value: site?.hasClickToCallLink ? "Present" : "Missing",
      tip: site?.hasClickToCallLink
        ? null
        : "Mobile visitors can't tap the phone number to call. You're losing 40–60% of mobile leads instantly.",
    },
    {
      id: "online-booking",
      label: "Online Booking / Scheduler",
      weight: 2,
      score: site?.hasOnlineBooking ? 100 : 0,
      value: site?.hasOnlineBooking ? "Present" : "Missing",
      tip: site?.hasOnlineBooking
        ? null
        : "No online scheduler found. Our Live Intakes platform adds AI-powered intake forms in week 1.",
    },
    {
      id: "live-chat",
      label: "Live Chat",
      weight: 1.5,
      score: site?.hasLiveChat ? 100 : 0,
      value: site?.hasLiveChat ? "Present" : "Missing",
      tip: site?.hasLiveChat
        ? null
        : "No live chat widget. Law firms with chat convert 30% more after-hours visitors.",
    },
    {
      id: "cta-density",
      label: "CTA Density",
      weight: 0.5,
      score: Math.min((site?.ctaTextSamples?.length ?? 0) * 34, 100),
      value: `${site?.ctaTextSamples?.length ?? 0} CTAs detected`,
      tip:
        (site?.ctaTextSamples?.length ?? 0) >= 2
          ? null
          : "Very few calls-to-action found. Every page should prompt visitors to contact, schedule, or call.",
    },
  ];
  const intakeCategory: AuditCategory = {
    id: "intake",
    label: "Intake & Conversion",
    icon: "📞",
    weight: 0.3,
    score: rollUp(intakeMetrics),
    metrics: intakeMetrics,
  };

  /* ── Trust & Authority ────────────────────────────────────────────── */
  const reviewWidgetPresent = (site?.reviewWidgetSignals?.length ?? 0) > 0;
  const trustSignalCount = site?.trustSignals?.length ?? 0;
  const attorneyNamesFound = (site?.attorneyNameCandidates?.length ?? 0) > 0;
  const hasReviewSchema = (site?.schemaTypesFound ?? []).some(
    (s) => s.toLowerCase().includes("review") || s.toLowerCase().includes("rating"),
  );

  const trustMetrics: AuditMetric[] = [
    {
      id: "review-widget",
      label: "Reviews Displayed on Site",
      weight: 2,
      score: reviewWidgetPresent ? 100 : 0,
      value: reviewWidgetPresent ? "Present" : "Not detected",
      tip: reviewWidgetPresent
        ? null
        : "Showing Google reviews on your site boosts conversion by up to 270%. We embed this automatically.",
    },
    {
      id: "trust-signals",
      label: "Trust Badges / Bar Memberships",
      weight: 2,
      score: Math.min(trustSignalCount * 34, 100),
      value: trustSignalCount > 0 ? `${trustSignalCount} found` : "None detected",
      tip:
        trustSignalCount >= 2
          ? null
          : "Add state bar membership badges, certifications, or award logos above the fold.",
    },
    {
      id: "attorney-bio",
      label: "Attorney Names / Bio",
      weight: 1.5,
      score: attorneyNamesFound ? 100 : 0,
      value: attorneyNamesFound
        ? (site?.attorneyNameCandidates?.slice(0, 2).join(", ") ?? "Found")
        : "None detected",
      tip: attorneyNamesFound
        ? null
        : "No visible attorney names or bios. Prospects hire people, not logos — humanize your firm.",
    },
    {
      id: "review-schema",
      label: "Review Markup (Schema.org)",
      weight: 1,
      score: hasReviewSchema ? 100 : 0,
      value: hasReviewSchema ? "Present" : "Missing",
      tip: hasReviewSchema
        ? null
        : "Review schema makes star ratings appear directly in Google search results (rich snippets).",
    },
  ];
  const trustCategory: AuditCategory = {
    id: "trust",
    label: "Trust & Authority",
    icon: "⭐",
    weight: 0.2,
    score: rollUp(trustMetrics),
    metrics: trustMetrics,
  };

  /* ── Local Presence ───────────────────────────────────────────────── */
  const matchScore =
    places?.matchConfidence === "high"
      ? 100
      : places?.matchConfidence === "medium"
        ? 60
        : places?.matchConfidence === "low"
          ? 20
          : 0;

  const ratingScore = !places?.rating
    ? 0
    : places.rating >= 4.8
      ? 100
      : places.rating >= 4.5
        ? 80
        : places.rating >= 4.0
          ? 60
          : 40;

  const reviewCountScore = !places?.reviewCount
    ? 0
    : Math.min(Math.round((places.reviewCount / 100) * 100), 100);

  const localRankScore =
    serp?.firmRankInLocalPack == null
      ? 0
      : serp.firmRankInLocalPack === 1
        ? 100
        : serp.firmRankInLocalPack === 2
          ? 75
          : serp.firmRankInLocalPack === 3
            ? 50
            : 20;

  const localMetrics: AuditMetric[] = [
    {
      id: "gbp-match",
      label: "Google Business Profile",
      weight: 2,
      score: matchScore,
      value:
        places?.matchConfidence === "high"
          ? "Verified match"
          : places?.matchConfidence === "medium"
            ? "Probable match"
            : "Not found / unverified",
      tip:
        places?.matchConfidence === "high"
          ? null
          : "Claim and verify your Google Business Profile immediately — it's free and powers the entire local pack.",
    },
    {
      id: "gbp-rating",
      label: "Google Star Rating",
      weight: 2,
      score: ratingScore,
      value: places?.rating != null ? `${places.rating.toFixed(1)} ★` : "No data",
      tip:
        ratingScore >= 80
          ? null
          : "Rating below 4.5 cuts click-through rates 30–50%. Proactively request reviews from satisfied clients.",
    },
    {
      id: "gbp-reviews",
      label: "Google Review Count",
      weight: 3,
      score: reviewCountScore,
      value: places?.reviewCount != null ? `${places.reviewCount} reviews` : "No data",
      tip:
        reviewCountScore >= 80
          ? null
          : `Target 100+ reviews to rank competitively in ${report.firm.city}. Gap: ${Math.max(0, 100 - (places?.reviewCount ?? 0))} reviews.`,
    },
    {
      id: "gbp-photos",
      label: "Photos on GBP",
      weight: 1,
      score: places?.hasPhotos ? 100 : 0,
      value: places?.hasPhotos ? "Present" : "Missing",
      tip: places?.hasPhotos
        ? null
        : "Profiles with photos get 42% more direction requests. Add 10+ office and team photos.",
    },
    {
      id: "local-rank",
      label: "Local Pack Rank",
      weight: 2,
      score: localRankScore,
      value:
        serp?.firmRankInLocalPack != null
          ? `#${serp.firmRankInLocalPack} in local pack`
          : "Not in top 3",
      tip:
        localRankScore >= 75
          ? null
          : "Not appearing in the local 3-pack means missing 44% of searchers who click the map results.",
    },
  ];
  const localCategory: AuditCategory = {
    id: "local",
    label: "Local Presence",
    icon: "📍",
    weight: 0.15,
    score: rollUp(localMetrics),
    metrics: localMetrics,
  };

  /* ── Site Performance ─────────────────────────────────────────────── */
  const pageSizeScore = !site?.pageBytes
    ? 50
    : site.pageBytes < 200_000
      ? 100
      : site.pageBytes < 500_000
        ? 80
        : site.pageBytes < 1_000_000
          ? 55
          : 25;

  const perfMetrics: AuditMetric[] = [
    {
      id: "mobile",
      label: "Mobile Viewport Tag",
      weight: 3,
      score: site?.hasMobileViewport ? 100 : 0,
      value: site?.hasMobileViewport ? "Configured" : "Missing",
      tip: site?.hasMobileViewport
        ? null
        : "No mobile viewport meta tag. 60%+ of law firm searches happen on mobile — this is critical.",
    },
    {
      id: "page-size",
      label: "Page Weight",
      weight: 2,
      score: pageSizeScore,
      value: site?.pageBytes != null ? `${Math.round(site.pageBytes / 1024)} KB` : "Unknown",
      tip:
        pageSizeScore >= 80
          ? null
          : "Heavy page slows load times. Google penalizes slow sites in mobile rankings.",
    },
    {
      id: "http-ok",
      label: "HTTP Response",
      weight: 1,
      score: site?.httpStatus === 200 ? 100 : 0,
      value: site?.httpStatus != null ? `HTTP ${site.httpStatus}` : "Unknown",
      tip:
        site?.httpStatus === 200
          ? null
          : `Site returned HTTP ${site?.httpStatus}. Investigate for redirect chains or errors.`,
    },
  ];
  const perfCategory: AuditCategory = {
    id: "performance",
    label: "Site Performance",
    icon: "⚡",
    weight: 0.05,
    score: rollUp(perfMetrics),
    metrics: perfMetrics,
  };

  const categories = [seoCategory, intakeCategory, trustCategory, localCategory, perfCategory];
  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const overallScore = Math.round(
    categories.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight,
  );

  const grade: AuditResult["grade"] =
    overallScore >= 80
      ? "A"
      : overallScore >= 65
        ? "B"
        : overallScore >= 50
          ? "C"
          : overallScore >= 35
            ? "D"
            : "F";

  return { overallScore, grade, categories };
}
