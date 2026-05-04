import { CTAButton } from "./ui/Button";
import { Logo } from "./ui/Logo";

interface EmptyStateProps {
  onLoadReport: () => void;
}

export function EmptyState({ onLoadReport }: EmptyStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-surface">
      <div className="max-w-md text-center">
        <Logo variant="full" size={120} className="mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-heading mb-2">No probe report loaded</h1>
        <p className="text-sm text-body leading-relaxed mb-6">
          The dashboard renders from a probe report — a JSON document the spike
          tool generates from a law firm's website, Google Business Profile, and
          local SERP data.
        </p>
        <div className="flex flex-col gap-2">
          <CTAButton fullWidth onClick={onLoadReport}>
            Load a Report
          </CTAButton>
          <p className="text-2xs text-subtle leading-relaxed mt-3">
            Run <code className="text-brand">npm run probe</code> in{" "}
            <code className="text-brand">spike/probe/</code> to generate a
            report, then upload the JSON output here.
          </p>
        </div>
      </div>
    </div>
  );
}
