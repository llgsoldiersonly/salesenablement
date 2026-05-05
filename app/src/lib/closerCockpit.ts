/**
 * Derives the live-call cockpit content from a probe report:
 *   - Talking points pulled from the audit's top concerns + competitor delta
 *   - Static objection library with rep-tested counters
 *   - Closing-trigger checklist (signals it's time to ask for the order)
 *
 * All deterministic — no LLM call. The brief generator handles narrative;
 * the cockpit is meant to be glanceable mid-call.
 */

import type { PackageRecommendation, ProbeReport, SerpCompetitor } from "../types";

export interface TalkingPoint {
  id: string;
  headline: string;
  detail: string;
  category: "intake" | "competitor" | "trust" | "package";
}

export interface Objection {
  id: string;
  text: string;
  counter: string;
  followUp?: string;
}

export interface ClosingTrigger {
  id: string;
  label: string;
  hint: string;
}

/* ── Talking points ──────────────────────────────────────────────────── */

export function buildTalkingPoints(
  report: ProbeReport,
  recommendation: PackageRecommendation,
): TalkingPoint[] {
  const points: TalkingPoint[] = [];
  const site = report.sources.siteScrape.data;
  const places = report.sources.googlePlaces.data;
  const serp = report.sources.serpLocal.data;

  // 1. Intake leak — the highest-leverage opener for legal marketing
  if (site && !site.hasContactForm && !site.hasClickToCallLink) {
    points.push({
      id: "intake-leak-critical",
      headline: "No contact form AND no click-to-call",
      detail:
        "Mobile prospects who tap your site can't reach you in one action. Every lead that bounces is revenue leaked to the competitor at #1.",
      category: "intake",
    });
  } else if (site && !site.hasClickToCallLink) {
    points.push({
      id: "no-click-to-call",
      headline: "No click-to-call on mobile",
      detail:
        "Visitors must copy/paste the number — most won't. A single tel: link recovers a meaningful share of mobile intake.",
      category: "intake",
    });
  } else if (site && !site.hasContactForm) {
    points.push({
      id: "no-contact-form",
      headline: "No contact form detected",
      detail:
        "Desktop prospects who don't want to call have no way to reach you. After-hours leads are lost entirely.",
      category: "intake",
    });
  }

  // 2. Review gap vs. local pack leader
  if (places && serp && serp.topLocalPackCompetitors.length > 0) {
    const topComp = topReviewedCompetitor(serp.topLocalPackCompetitors, places.matchedName);
    if (topComp && topComp.reviewCount != null && places.reviewCount != null) {
      const gap = topComp.reviewCount - places.reviewCount;
      if (gap >= 25) {
        points.push({
          id: "review-gap",
          headline: `${gap} review gap vs. ${topComp.name}`,
          detail: `You have ${places.reviewCount}, they have ${topComp.reviewCount}. Reviews are the #1 ranking factor in local pack — closing this gap is the fastest path to ranking #1.`,
          category: "competitor",
        });
      }
    }
  }

  // 3. Local pack rank
  if (serp && serp.firmRankInLocalPack != null) {
    if (serp.firmRankInLocalPack > 3) {
      points.push({
        id: "local-pack-miss",
        headline: `Ranked #${serp.firmRankInLocalPack} — outside the 3-pack`,
        detail:
          "Searches above #3 in Maps get less than 5% of the clicks. Until you're top-3, intake is a trickle.",
        category: "competitor",
      });
    } else if (serp.firmRankInLocalPack === 3) {
      points.push({
        id: "local-pack-bottom",
        headline: "Ranked #3 in the local pack",
        detail:
          "You're in the pack but bottom of it — #1 captures roughly half of all clicks. Two competitors above you is two competitors stealing your leads.",
        category: "competitor",
      });
    }
  }

  // 4. Trust signals
  if (site && site.trustSignals.length === 0) {
    points.push({
      id: "no-trust-signals",
      headline: "No trust signals on the homepage",
      detail:
        "No bar admissions, awards, case results, or media mentions. Prospects who hit your site can't quickly verify you're legit.",
      category: "trust",
    });
  }

  // 5. Recommendation hook (if we have a primary package)
  if (recommendation.primaryReasons.length > 0) {
    points.push({
      id: "package-hook",
      headline: `Recommended: ${packageDisplay(recommendation.primary)}${recommendation.addGravity ? " + Gravity" : ""}`,
      detail: recommendation.primaryReasons[0],
      category: "package",
    });
  }

  return points.slice(0, 5);
}

function topReviewedCompetitor(
  comps: SerpCompetitor[],
  selfName: string | null,
): SerpCompetitor | null {
  const others = comps.filter((c) => c.name !== selfName && c.reviewCount != null);
  if (others.length === 0) return null;
  return others.reduce((best, c) => ((c.reviewCount ?? 0) > (best.reviewCount ?? 0) ? c : best));
}

function packageDisplay(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/* ── Objection library ───────────────────────────────────────────────── */

export const OBJECTIONS: Objection[] = [
  {
    id: "referrals-only",
    text: "We get most of our business from referrals.",
    counter:
      "That's a strong foundation — but referrals plateau at the size of your network. Digital is what scales beyond it. The firms beating you in the local pack get referrals AND digital leads.",
    followUp: "Ask: What's your monthly new-case target? Are referrals alone hitting it?",
  },
  {
    id: "tried-marketing",
    text: "We tried marketing before and it didn't work.",
    counter:
      "What did 'work' mean to you — calls or signed retainers? Most agencies optimize for traffic and impressions because that's what they can control. We optimize for signed cases because that's what pays your bills.",
    followUp: "Ask: How were you measuring results? What was the agency reporting?",
  },
  {
    id: "too-expensive",
    text: "We can't afford that right now.",
    counter:
      "Walk me through what you're spending on intake today — staff, phones, missed-call answering services. We usually replace existing inefficiency rather than add cost. One signed felony case covers a quarter of marketing.",
    followUp: "Ask: What's your average case value? How many cases would this need to generate?",
  },
  {
    id: "send-email",
    text: "Send me an email and I'll think about it.",
    counter:
      "Happy to. Want me to also include the 90-day case study from a similar firm in your practice area? And while I have you — what's the one thing that would have to be true for you to say yes?",
    followUp: "Don't end on email — get a follow-up scheduled before you hang up.",
  },
  {
    id: "have-marketing-person",
    text: "We already have someone handling marketing.",
    counter:
      "Perfect. We work alongside in-house teams — they handle brand, content, and client relationships. We handle the lead engine: SEO, GLSA, Maps, and intake automation. Most in-house marketers don't have access to our local-pack tooling.",
    followUp: "Ask: What's your in-house person focused on? Where are the gaps?",
  },
  {
    id: "competitor-pitched",
    text: "Your competitor pitched me last week.",
    counter:
      "What did they offer? I want to make sure you're comparing apples to apples. Most don't include GLSA management, GMB posting cadence, or NAP submissions in their base package — and those are what actually move the local pack.",
    followUp: "Ask for their proposal — even ballpark — so you can show line-item differences.",
  },
  {
    id: "long-contract",
    text: "I don't want to lock into a long contract.",
    counter:
      "I get it. SEO needs 90 days to start producing — anyone promising results faster is buying ads, not building authority. The contract protects YOUR investment: it guarantees we keep working when the algorithm shifts in month 4.",
    followUp: "Walk through the 90-day milestone schedule so they see what they're paying for.",
  },
  {
    id: "need-think-about-it",
    text: "Let me think about it.",
    counter:
      "Of course. What specifically do you need to think through? If it's the package fit, let's drill in now. If it's pricing, I can walk through the ROI math. If it's timing — the algorithm doesn't wait, and your competitor isn't waiting either.",
    followUp: "Surface the real objection — 'think about it' is almost never the actual blocker.",
  },
];

/* ── Closing triggers ────────────────────────────────────────────────── */

export const CLOSING_TRIGGERS: ClosingTrigger[] = [
  {
    id: "asked-price",
    label: "Asked about pricing",
    hint: "Pricing questions = buying signal. Don't bury the price — confirm it confidently.",
  },
  {
    id: "asked-timeline",
    label: "Asked when we can start",
    hint: "They're picturing it live. Match their urgency: 'We can have onboarding done by Friday.'",
  },
  {
    id: "mentioned-losing",
    label: "Mentioned losing leads or missing calls",
    hint: "Pain admitted out loud. Quantify it: 'How many missed calls per week × your average case fee?'",
  },
  {
    id: "asked-references",
    label: "Asked for references or case studies",
    hint: "They're looking for permission to say yes. Send the strongest one and ask for a decision date.",
  },
  {
    id: "compared-competitor",
    label: "Compared us to a competitor",
    hint: "They're shopping. Differentiate on what's NOT in their package — GLSA, GMB cadence, intake QA.",
  },
  {
    id: "asked-contract",
    label: "Asked about contract length / terms",
    hint: "Logistics question = mental yes. Walk through terms, then ask for the signature.",
  },
  {
    id: "should-do-something",
    label: "Said 'we should do something about that'",
    hint: "Direct invitation. Respond with: 'Great — what's stopping us from starting today?'",
  },
];
