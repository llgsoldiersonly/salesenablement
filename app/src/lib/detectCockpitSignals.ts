/**
 * Keyword-based signal detection for the Closer Cockpit.
 *
 * Takes a final transcript utterance and returns which objection (if any)
 * the prospect is raising, plus any closing triggers that just fired.
 *
 * Intentionally keyword-only — fast, free, works offline. The trade-off is
 * false negatives on unusual phrasing. Upgrade to Claude classification
 * (POST /api/classify) if accuracy becomes a bottleneck.
 */

import { OBJECTIONS, CLOSING_TRIGGERS } from "./closerCockpit";

export interface DetectedSignals {
  objectionId: string | null;
  triggerIds: string[];
}

/* Keyword maps — each entry is { id, phrases[] } where every phrase is
   lowercased and checked as a substring of the utterance. */

const OBJECTION_KEYWORDS: Array<{ id: string; phrases: string[] }> = [
  {
    id: "referrals-only",
    phrases: ["referral", "word of mouth", "plenty of business", "enough business"],
  },
  {
    id: "tried-marketing",
    phrases: ["tried marketing", "tried seo", "didn't work", "doesn't work", "never worked", "waste of money"],
  },
  {
    id: "too-expensive",
    phrases: ["can't afford", "cannot afford", "too expensive", "out of budget", "over budget", "too much money"],
  },
  {
    id: "send-email",
    phrases: ["send me an email", "shoot me an email", "send it over", "i'll think about it", "think about it"],
  },
  {
    id: "have-marketing-person",
    phrases: ["in-house", "in house", "already have someone", "have a marketing", "marketing person", "marketing team"],
  },
  {
    id: "competitor-pitched",
    phrases: ["also talking to", "talking to someone else", "other company", "competitor", "another agency"],
  },
  {
    id: "long-contract",
    phrases: ["long contract", "year contract", "don't want to commit", "lock in", "locked in", "tied to"],
  },
  {
    id: "need-think-about-it",
    phrases: ["let me think", "need to think", "get back to you", "circle back", "follow up"],
  },
];

const TRIGGER_KEYWORDS: Array<{ id: string; phrases: string[] }> = [
  {
    id: "asked-price",
    phrases: ["how much", "what does it cost", "what's the price", "pricing", "what would that run", "what's the investment"],
  },
  {
    id: "asked-timeline",
    phrases: ["when can you start", "when can we start", "how soon", "what's the timeline", "start date", "when would it go live"],
  },
  {
    id: "mentioned-losing",
    phrases: ["losing leads", "missing calls", "leads are falling", "we're losing", "dropping leads", "missed calls"],
  },
  {
    id: "asked-references",
    phrases: ["references", "case study", "case studies", "who have you worked with", "examples", "other law firms"],
  },
  {
    id: "compared-competitor",
    phrases: ["how are you different", "what makes you different", "you vs", "compared to", "better than"],
  },
  {
    id: "asked-contract",
    phrases: ["what's the contract", "contract length", "how long is the", "agreement", "month to month", "cancel anytime"],
  },
  {
    id: "should-do-something",
    phrases: ["should do something", "need to fix", "need to address", "makes sense", "we should", "definitely need"],
  },
];

export function detectSignals(utterance: string): DetectedSignals {
  const lower = utterance.toLowerCase();

  const objectionId =
    OBJECTION_KEYWORDS.find((o) => o.phrases.some((p) => lower.includes(p)))?.id ?? null;

  const triggerIds = TRIGGER_KEYWORDS
    .filter((t) => t.phrases.some((p) => lower.includes(p)))
    .map((t) => t.id);

  return { objectionId, triggerIds };
}

/* Sanity check at module load: warn if an ID in KEYWORDS doesn't exist in
   the cockpit library (catches copy-paste drift). */
if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
  const knownObjectionIds = new Set(OBJECTIONS.map((o) => o.id));
  const knownTriggerIds = new Set(CLOSING_TRIGGERS.map((t) => t.id));
  for (const { id } of OBJECTION_KEYWORDS) {
    if (!knownObjectionIds.has(id)) {
      console.warn(`detectCockpitSignals: unknown objection id "${id}"`);
    }
  }
  for (const { id } of TRIGGER_KEYWORDS) {
    if (!knownTriggerIds.has(id)) {
      console.warn(`detectCockpitSignals: unknown trigger id "${id}"`);
    }
  }
}
