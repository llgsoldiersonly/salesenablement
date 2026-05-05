import { CloserCockpit } from "../CloserCockpit";
import type { CallSession, PackageRecommendation, ProbeReport } from "../../types";

interface RightRailProps {
  session: CallSession;
  firmState: string;
  callActive?: boolean;
  callStartedAt?: number | null;
  report?: ProbeReport;
  recommendation?: PackageRecommendation;
  onEndCall?: () => void;
}

export function RightRail({
  session,
  firmState,
  callActive,
  callStartedAt,
  report,
  recommendation,
  onEndCall,
}: RightRailProps) {
  // Live call mode — expand and host the closer cockpit.
  if (callActive && callStartedAt && report && recommendation && onEndCall) {
    return (
      <aside className="w-[440px] shrink-0 h-full bg-surface border-l-2 border-l-brand flex flex-col py-5 px-4 overflow-hidden">
        <CloserCockpit
          report={report}
          recommendation={recommendation}
          callStartedAt={callStartedAt}
          onEndCall={onEndCall}
        />
      </aside>
    );
  }

  // Idle mode — original right rail.
  return (
    <aside className="w-[288px] shrink-0 h-full bg-surface border-l border-[var(--color-border)] flex flex-col py-5 px-4 gap-5 overflow-y-auto scrollbar-thin">
      {/* Live Call Notes */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-heading mb-3">
          Live Call Notes
        </h2>
        <div className="flex flex-col gap-3">
          {session.objections.length > 0 && (
            <div>
              <p className="text-2xs uppercase tracking-wider text-subtle font-semibold mb-2">
                Current Objections
              </p>
              {session.objections.map((obj, i) => (
                <div
                  key={i}
                  className="rounded-[8px] bg-surface shadow-sm border border-[var(--color-border)] px-3 py-2 mb-2"
                >
                  <p className="text-xs text-body italic">"{obj}"</p>
                  {i === 0 && (
                    <p className="text-2xs text-brand font-semibold uppercase tracking-wider mt-1">
                      Rebuttal: Focus on high-value cases only
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {session.closingTriggers.length > 0 && (
            <div>
              <p className="text-2xs uppercase tracking-wider text-subtle font-semibold mb-2">
                Closing Triggers
              </p>
              {session.closingTriggers.map((trigger, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <span className="text-[var(--color-success)] text-xs">✓</span>
                  <span className="text-xs text-body">{trigger}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Market Saturation Map */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-heading mb-3">
          Market Saturation Map
        </h2>
        <div className="rounded-[8px] overflow-hidden shadow-md bg-[#0F172A] aspect-square flex items-end relative">
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-brand rounded-full opacity-60"
                style={{
                  left: `${10 + Math.sin(i * 1.7) * 35 + i * 3}%`,
                  top:  `${15 + Math.cos(i * 2.1) * 30 + i * 2.5}%`,
                }}
              />
            ))}
          </div>
          <div className="relative z-10 w-full px-3 py-2">
            <span className="text-white text-xs font-semibold bg-[#0F172A]/80 px-2 py-1 rounded">
              High Density Area
            </span>
          </div>
        </div>
        <p className="text-2xs text-subtle text-center mt-1.5 uppercase tracking-wider">
          Market Saturation Map: {firmState.slice(0, 2).toUpperCase()}-59401
        </p>
      </section>

      {/* Network Health */}
      <section className="mt-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-heading">Network Health</span>
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
        </div>
        <div className="h-1 rounded-full bg-surface shadow-inset overflow-hidden">
          <div className="h-full w-[88%] bg-heading rounded-full" />
        </div>
        <p className="text-2xs text-subtle mt-1">88% Lead Accuracy Rate</p>
      </section>
    </aside>
  );
}
