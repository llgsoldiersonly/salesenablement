# AI-Leverage Plays Library

The 90-Day Plan tab is what separates this dashboard from every other agency pitch. The "AI-leverage play" inside each phase block is the trust-builder — the thing that makes a sharp CMO say "huh, I hadn't thought of that."

This file is a library of plays organized by phase and niche. Each play has:

- A name
- The agency tactic
- The AI/tool that compresses time
- A "weeks compressed" badge (months of old-school work → days/weeks now)
- The metric it moves
- When NOT to use it (the failure mode)

**Pick one play per phase. Don't repeat across phases. Match the play to the niche and the specific finding from tabs 1–5.**

---

## How "weeks compressed" works

The badge is a credibility lever. Format: "Weeks Compressed: X". It tells the prospect: "this used to take Y weeks of agency time. Now it takes Z because of this AI tool."

Examples:
- "Weeks Compressed: 8" — the play replaces 8 weeks of work
- "Weeks Compressed: 4" — half-quarter speedup
- "Weeks Compressed: 12" — full quarter

Pick a number you can defend. If a CMO asks "why 8?" the answer should be "because manually clustering search-term reports for 200 keywords is 80 hours of analyst time, and the AI does it in 4 hours."

---

## DAYS 1–30 Plays — Foundation & Quick Wins

### Play 1A — Sales-Call-Transcript-to-FAQ Pipeline
- **For:** Any niche with a sales process. Especially good for B2B finance, SaaS, professional services.
- **Tactic:** Pull the last 60 days of sales call transcripts (Gong, Fireflies, Granola). Embed them with a frontier model. Cluster by question type. Auto-generate the 25 most-asked FAQs as schema-marked content for service pages.
- **AI tool:** GPT-4o or Claude Sonnet for clustering + generation; FAQ schema validator for output.
- **Weeks Compressed:** 6 (manual: review 60+ transcripts, draft 25 FAQs = 6 weeks. With AI: ~3 days.)
- **Moves:** organic traffic on long-tail informational queries, on-page time, sales call efficiency (sales reps stop answering the same 5 questions every demo).
- **Don't use when:** the prospect has fewer than 20 transcripts on file, or in compliance-heavy niches where every FAQ needs legal review (still useful, just adds a review week).

### Play 1B — AI-Clustered Search-Term Report → Negative Keyword Mining
- **For:** Any prospect already running Google Ads.
- **Tactic:** Export the last 90 days of search-term reports. Embed each search term. Cluster by intent. Surface the clusters that converted at < 30% of account average — those are negative keyword candidates. Add as Campaign Negatives in week 1.
- **AI tool:** GPT-4o-mini or Sonnet for clustering; OpenAI embeddings for vectorization.
- **Weeks Compressed:** 3 (manual: scrolling through 5,000+ search terms = 3 weeks of analyst time. AI: hours.)
- **Moves:** wasted spend down 15–35%, CPA down by similar.
- **Don't use when:** the prospect has < $10K/mo spend (not enough data to cluster).

### Play 1C — Programmatic "Service × Industry" Landing Pages
- **For:** B2B / financial services / SaaS where the buyer's industry matters (e.g., "equipment financing for restaurants" vs. "equipment financing for construction").
- **Tactic:** Build a template landing page with 8 dynamic blocks (hero, industry stat, ROI calculator, testimonials filtered by industry, FAQ filtered by industry, comparison vs. competitor, CTA). Generate 25–60 variants programmatically (one per industry) using AI for the industry-specific copy + stat lookup.
- **AI tool:** Claude / GPT for industry copy; Astro or Next.js dynamic routes for the build.
- **Weeks Compressed:** 12 (manual build of 30 pages: 12 weeks. AI-assisted: 2 weeks.)
- **Moves:** organic + paid landing-page conversion rate (+50–150% on industry-specific paid traffic that previously hit a generic page).
- **Don't use when:** the niche doesn't segment by industry; or when content quality concerns exceed scale concerns (these pages must be QA'd by a human or they violate Google's spam policies).

### Play 1D — AI-Generated Local Page Cluster (for local services)
- **For:** Local services in metros with > 5 service areas.
- **Tactic:** Build location pages for the top 30 service areas. Use AI to draft the location-specific intro (geography, common pain points, recent local data) while keeping the offer/CTA/forms identical. Pair with local schema + GBP linkage.
- **AI tool:** Claude for location copy with grounding from public data sources.
- **Weeks Compressed:** 8.
- **Moves:** Local pack rankings, local organic traffic, GBP impressions in those service areas.
- **Don't use when:** the prospect operates in fewer than 5 service areas (overkill).

---

## DAYS 31–60 Plays — Scale & Compound

### Play 2A — Ad Copy Matrix Testing (50+ variants)
- **For:** Any prospect spending > $5K/mo on Google or Meta.
- **Tactic:** Generate 50–100 ad variants by combining 5 hooks × 5 proof points × 4 CTAs. Use Responsive Search Ads to test the matrix. Cull weekly using Quality Score and CTR data, generate the next batch from winners.
- **AI tool:** Claude Sonnet or GPT-4o for variant generation; Google Ads API for upload; spreadsheet/Sheet-based control panel.
- **Weeks Compressed:** 8 (manual: writing 100 ad variants by hand = months. AI: 2 days.)
- **Moves:** CTR up 25–60%, Quality Score up 1–2 points, effective CPC down 15–30%.
- **Don't use when:** under $3K/mo spend (you need volume to detect winners).

### Play 2B — Predictive Bid Management with Custom Bidding Rules
- **For:** Any account on Smart Bidding for > 90 days with > $20K/mo spend.
- **Tactic:** Layer a custom-bid model on top of Smart Bidding using converted-customer LTV data (from CRM). The model bids more aggressively on segments with historical 2–3x LTV.
- **AI tool:** BigQuery / Snowflake for LTV joins; Google Ads scripts for bid adjustments; or Optmyzr / Adalysis for off-the-shelf.
- **Weeks Compressed:** 6.
- **Moves:** ROAS up 15–35% by reweighting toward high-LTV segments.
- **Don't use when:** CRM data is unreliable or LTV cohorts are too small (< 100 customers per segment).

### Play 2C — Embedding-Based Content Gap Analysis
- **For:** Any prospect with a content team or willingness to invest in SEO.
- **Tactic:** Embed all of the prospect's existing content + the top 10 ranking pages for their target cluster. Cluster in 2D and visualize. Identify "gap zones" (semantic territory competitors own but the prospect doesn't). Generate a content brief for each gap.
- **AI tool:** OpenAI embeddings + UMAP for clustering; a frontier model for brief generation.
- **Weeks Compressed:** 5.
- **Moves:** topic cluster coverage from 40% → 70% in 60 days, organic traffic up 30–80% in covered clusters.
- **Don't use when:** the niche has < 50 ranking pages worth analyzing (early-stage niches).

### Play 2D — AI Sales-Call Coach (Internal Compounding Play)
- **For:** Prospects with 3+ sales reps.
- **Tactic:** Run all sales calls through an AI coach that auto-extracts objections handled, value props mentioned, and competitor mentions. Roll up weekly to identify the patterns that drive deals. Feed those patterns into the next month's ad copy and landing-page copy.
- **AI tool:** Gong/Fireflies for transcripts; Claude/GPT for analysis; a simple dashboard for aggregation.
- **Weeks Compressed:** 4 (per quarter — it's compounding).
- **Moves:** sales close rate, marketing-to-sales message alignment, ad copy relevance.
- **Don't use when:** the prospect has 1 founder doing all the selling (insufficient call volume to mine).

---

## DAYS 61–90 Plays — Expand & Defend

### Play 3A — Programmatic Comparison Pages ("[Prospect] vs. [Competitor]")
- **For:** Any niche with named competitors a buyer might Google.
- **Tactic:** Build template comparison pages for the top 8 competitors. Each page: side-by-side feature matrix, pricing, use-case fit. AI drafts the competitor analysis from public data (G2, Capterra, competitor websites). Human QA before publish.
- **AI tool:** Claude for analysis; Apify / web scraping for competitor data; static-site generator.
- **Weeks Compressed:** 6.
- **Moves:** "alternative to X" + "X vs Y" keywords (highest-intent queries in many B2B niches), often capturing 40–80% of the consideration-stage traffic competitors monopolize.
- **Don't use when:** the prospect is too small or too new to credibly compare against an incumbent (you'll look amateurish).

### Play 3B — Predictive Lead Scoring with Embedding-Based Intent Classification
- **For:** B2B prospects with > 100 leads/mo.
- **Tactic:** Score every inbound lead within seconds of form submission by embedding the form text, the LinkedIn profile (via enrichment), and the company website. Compare against historical converters. Route high-score leads to a 24-hour callback queue, mid-score to nurture, low-score to drip.
- **AI tool:** Clearbit/Apollo for enrichment; embedding model for similarity; Zapier/Make for routing.
- **Weeks Compressed:** 8 (manual lead routing rules + scoring takes a quarter to build well).
- **Moves:** sales close rate on the high-score segment up 30–80%; sales rep time reclaimed.
- **Don't use when:** lead volume is too low to learn patterns (< 50 conversions on file).

### Play 3C — AI-Driven Service Expansion Pilot (the blue-ocean play)
- **For:** Any prospect with explicit service opportunities (§3.1 of the SKILL).
- **Tactic:** Pick the top service opportunity from the discovery (e.g., for a small-business lender: invoice factoring). Build a 30-day pilot funnel: programmatic landing pages for the new service, retargeting from the core service to the new service, AI-generated educational content. Measure willingness to convert.
- **AI tool:** Stack from earlier plays — programmatic pages (1C), embedding-based intent classification (3B), AI ad copy matrix (2A).
- **Weeks Compressed:** 10 (a normal pilot launch is a quarter; this compresses to 30 days).
- **Moves:** new service line revenue, deal size, average customer LTV (cross-sell).
- **Don't use when:** there's no real service opportunity in the discovery (don't fake one to fill the slot — drop this play and pick another).

### Play 3D — AI-Generated Video Assets at Scale (HeyGen / Synthesia)
- **For:** Niches where short-form testimonials, explainers, or service overviews drive paid social or YouTube discovery.
- **Tactic:** Take the prospect's top 20 organic landing pages or service pages. Auto-script 60-second explainer videos for each (based on the page content). Render with a consistent AI avatar (HeyGen or Synthesia). Distribute on YouTube Shorts, Instagram Reels, LinkedIn for B2B.
- **AI tool:** GPT/Claude for scripts; HeyGen/Synthesia for video; Buffer/Hootsuite for distribution.
- **Weeks Compressed:** 12.
- **Moves:** YouTube channel discovery, social proof on landing pages (embed the videos), brand recall.
- **Don't use when:** the niche is one where AI-avatar videos read as fake (luxury, high-touch services, anything where authenticity matters more than scale).

### Play 3E — Search-Generative-Experience (SGE) Optimization
- **For:** Any prospect with > 30% of impressions in queries that now show AI overviews.
- **Tactic:** Audit which target keywords now show Google's AI Overviews. Restructure content for those keywords toward citation-friendly formats: short summary at top, sourced data, FAQ schema, named entity definitions. The goal: get cited inside the AI Overview.
- **AI tool:** Manual SERP scraping + AI for content restructure recommendations.
- **Weeks Compressed:** 4.
- **Moves:** branded mentions inside AI Overviews, brand-direct traffic (counter to AI Overview cannibalization).
- **Don't use when:** the niche's queries don't show AI Overviews yet (mostly transactional commerce queries).

---

## Niche-by-niche play recommendations

When uncertain, these are good defaults:

| Niche | Days 1–30 | Days 31–60 | Days 61–90 |
|---|---|---|---|
| Small business lending | 1A (Sales-FAQ) | 2A (Ad Matrix) | 3C (Service Expansion) |
| SaaS SMB | 1B (Negatives) | 2C (Content Gap) | 3A (Comparison Pages) |
| Local services | 1D (Local Pages) | 2A (Ad Matrix) | 3D (AI Video) |
| Professional services | 1A (Sales-FAQ) | 2D (Sales Coach) | 3B (Lead Scoring) |
| Healthcare | 1D (Local Pages) | 2C (Content Gap) | 3D (AI Video) |
| E-commerce | 1B (Negatives) | 2A (Ad Matrix) | 3D (AI Video) |
| Real estate | 1D (Local Pages) | 2A (Ad Matrix) | 3A (Comparison Pages — agents vs. agents) |
| Education / coaching | 1C (Programmatic Pages) | 2C (Content Gap) | 3D (AI Video) |
| B2B SaaS Enterprise | 1A (Sales-FAQ) | 2D (Sales Coach) | 3B (Lead Scoring) |

These are starting points. The actual choice depends on the specific Tab 1–5 findings.

---

## How to write the play in the dashboard

Each play renders as a small card inside the phase block:

```
┌────────────────────────────────────────────────────┐
│ AI-LEVERAGE PLAY                  Weeks Compressed │
│ Sales-Call-Transcript-to-FAQ            ━━━ 6 ━━━ │
│ Pipeline                                            │
│                                                    │
│ Pull last 60 days of [their CRM/transcript tool]  │
│ calls. Cluster the top 25 questions. Publish as   │
│ FAQ schema on each service page.                  │
│                                                    │
│ → Moves: long-tail organic, on-page time, sales   │
│   demo efficiency.                                 │
└────────────────────────────────────────────────────┘
```

Reference the prospect's actual tools (e.g., "your existing Gong workspace"). Reference the actual finding from tabs 1–5 ("the 14 long-tail keywords currently ranking on page 2").

That specificity is the entire reason this tab beats a generic agency pitch.
