import { Card } from "../ui/Card";
import type { ProbeReport } from "../../types";

interface IntakeTabProps { report: ProbeReport; }

export function IntakeTab({ report }: IntakeTabProps) {
  const site = report.sources.siteScrape.data;

  const signals = [
    { label: "Contact Form",        present: site?.hasContactForm      ?? false },
    { label: "Click-to-Call Link",  present: site?.hasClickToCallLink  ?? false },
    { label: "Online Booking",      present: site?.hasOnlineBooking    ?? false },
    { label: "Live Chat",           present: site?.hasLiveChat         ?? false },
    { label: "Mobile Viewport",     present: site?.hasMobileViewport   ?? false },
  ];

  return (
    <div className="flex flex-col gap-5 p-6 overflow-y-auto scrollbar-thin flex-1">
      <h2 className="text-2xl font-semibold text-heading">Intake Analysis</h2>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-heading mb-4">Intake Signals</h3>
          <ul className="flex flex-col gap-3">
            {signals.map((s) => (
              <li key={s.label} className="flex items-center justify-between">
                <span className="text-sm text-body">{s.label}</span>
                <span className={`text-sm font-semibold ${s.present ? "text-[var(--color-success)]" : "text-brand"}`}>
                  {s.present ? "✓ Present" : "✗ Missing"}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card accent>
          <h3 className="text-sm font-semibold text-heading mb-2">Intake Leak Risk</h3>
          <p className="text-sm text-body leading-relaxed">
            {!site?.hasContactForm && !site?.hasClickToCallLink
              ? "No contact form AND no click-to-call — most mobile visitors cannot reach this firm without manually dialing. Estimated 60–70% drop-off rate."
              : !site?.hasClickToCallLink
              ? "No click-to-call link means mobile visitors must copy/paste the phone number — 30–40% bounce at this step."
              : "Intake signals look healthy. Focus on conversion rate optimization."}
          </p>
          <p className="text-xs font-semibold text-brand mt-3 italic">
            We fix this in week 1 of any package.
          </p>
        </Card>
      </div>

      {site?.ctaTextSamples && site.ctaTextSamples.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-heading mb-3">CTA Text Found on Site</h3>
          <div className="flex flex-wrap gap-2">
            {site.ctaTextSamples.map((cta, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-surface shadow-sm border border-[var(--color-border)] text-xs text-body">
                {cta}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
