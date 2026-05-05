import { Button, CTAButton } from "./ui/Button";
import { Logo } from "./ui/Logo";

interface EmptyStateProps {
  onLoadReport: () => void;
  onNewAssessment?: () => void;
}

export function EmptyState({ onLoadReport, onNewAssessment }: EmptyStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-surface">
      <div className="max-w-md text-center">
        <Logo variant="full" size={120} className="mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-heading mb-2">No probe report loaded</h1>
        <p className="text-sm text-body leading-relaxed mb-6">
          Run a live assessment on any law firm — the dashboard scrapes their
          website, Google Business Profile, and local search results in seconds.
        </p>
        <div className="flex flex-col gap-2">
          {onNewAssessment && (
            <CTAButton fullWidth onClick={onNewAssessment}>
              Run New Assessment
            </CTAButton>
          )}
          <Button variant="neutral" fullWidth onClick={onLoadReport}>
            Load Saved Report
          </Button>
        </div>
      </div>
    </div>
  );
}
