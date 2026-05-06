import { CloserCockpit } from "../CloserCockpit";
import { AskAIPanel } from "../closer/AskAIPanel";
import type { PackageRecommendation, ProbeReport } from "../../types";
import type { AskContext } from "../../../server/ask-handler";

interface RightRailProps {
  callActive?: boolean;
  callStartedAt?: number | null;
  report?: ProbeReport;
  recommendation?: PackageRecommendation;
  onEndCall?: () => void;
}

export function RightRail({
  callActive,
  callStartedAt,
  report,
  recommendation,
  onEndCall,
}: RightRailProps) {
  // Live call mode — expand and host the closer cockpit.
  if (callActive && callStartedAt && report && recommendation && onEndCall) {
    return (
      <aside className="w-full md:w-[440px] shrink-0 h-full bg-surface border-l-0 md:border-l-2 md:border-l-brand flex flex-col py-3 md:py-5 px-3 md:px-4 overflow-hidden">
        <CloserCockpit
          report={report}
          recommendation={recommendation}
          callStartedAt={callStartedAt}
          onEndCall={onEndCall}
        />
      </aside>
    );
  }

  const askContext: AskContext | null = report
    ? {
        firmName: report.firm.name,
        firmCity: report.firm.city,
        firmState: report.firm.state,
        practiceArea: report.firm.practiceArea,
        coverageScore: report.coverageScore,
        concerns: report.concerns ?? [],
        recommendedPackage: recommendation?.primary ?? "unknown",
        competitors: [
          ...(report.sources.serpLocal.data?.topLocalPackCompetitors.slice(0, 3).map((c) => c.name) ?? []),
          ...(report.sources.serpLocal.data?.topOrganicCompetitors.slice(0, 2).map((c) => c.name) ?? []),
        ],
      }
    : null;

  // Idle mode — original right rail.
  return (
    <aside className="w-[288px] shrink-0 h-full bg-surface border-l border-[var(--color-border)] flex flex-col py-5 px-4 gap-5 overflow-y-auto scrollbar-thin">
      {askContext && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-heading mb-3">
            Ask AI
          </h2>
          <AskAIPanel context={askContext} />
        </section>
      )}
    </aside>
  );
}
