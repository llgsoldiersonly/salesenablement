import { readFile } from "node:fs/promises";
import { argv, exit, stdout } from "node:process";
import { parseSiteHtml } from "./sources/site-scrape.ts";

async function main(): Promise<void> {
  const file = argv[2] ?? "test-data/fixture-firm.html";
  const html = await readFile(file, "utf-8");
  const data = parseSiteHtml({
    html,
    fetchedUrl: "https://example.test/",
    finalUrl: "https://example.test/",
    httpStatus: 200,
    bytes: Buffer.byteLength(html, "utf-8"),
    fetchMs: 0,
  });

  const out = {
    title: data.title,
    metaDescription: data.metaDescription,
    h1s: data.h1s,
    h2s: data.h2s,
    phoneNumbers: data.phoneNumbers,
    emails: data.emails,
    intake: {
      hasContactForm: data.hasContactForm,
      hasClickToCallLink: data.hasClickToCallLink,
      hasOnlineBooking: data.hasOnlineBooking,
      hasLiveChat: data.hasLiveChat,
      hasMobileViewport: data.hasMobileViewport,
    },
    practiceAreaMentions: data.practiceAreaMentions,
    trustSignals: data.trustSignals,
    reviewWidgetSignals: data.reviewWidgetSignals,
    schemaTypesFound: data.schemaTypesFound,
    ctaTextSamples: data.ctaTextSamples,
    attorneyNameCandidates: data.attorneyNameCandidates,
    warnings: data.warnings,
  };
  stdout.write(JSON.stringify(out, null, 2) + "\n");

  const checks: Array<[string, boolean]> = [
    ["title found", !!data.title],
    ["meta description found", !!data.metaDescription],
    ["at least one H1", data.h1s.length > 0],
    ["phone number extracted", data.phoneNumbers.length > 0],
    ["email extracted", data.emails.length > 0],
    ["contact form detected", data.hasContactForm],
    ["click-to-call link detected", data.hasClickToCallLink],
    ["live chat detected", data.hasLiveChat],
    ["mobile viewport detected", data.hasMobileViewport],
    ["practice area terms found", data.practiceAreaMentions.length > 0],
    ["trust signals found", data.trustSignals.length > 0],
    ["review widget signals found", data.reviewWidgetSignals.length > 0],
    ["JSON-LD schema parsed", data.schemaTypesFound.includes("LegalService")],
    ["attorney name extracted", data.attorneyNameCandidates.length > 0],
    ["CTA text captured", data.ctaTextSamples.length > 0],
  ];

  stdout.write("\nFIXTURE CHECKS:\n");
  let pass = 0;
  for (const [label, ok] of checks) {
    stdout.write(`  ${ok ? "[PASS]" : "[FAIL]"} ${label}\n`);
    if (ok) pass++;
  }
  stdout.write(`\n${pass}/${checks.length} checks passed\n`);
  if (pass !== checks.length) exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  exit(2);
});
