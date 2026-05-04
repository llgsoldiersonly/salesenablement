import { CTAButton } from "../ui/Button";
import { DotBadge } from "../ui/Badge";
import { Logo } from "../ui/Logo";
import { ShareButton } from "../ShareButton";
import type { ProbeReport, TabId } from "../../types";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview",     label: "Overview" },
  { id: "intake",       label: "Site Audit" },
  { id: "competitors",  label: "Competitors" },
  { id: "calculator",   label: "Calculator" },
  { id: "notes",        label: "Notes" },
];

interface TopBarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  callStatus: "idle" | "active" | "closed";
  onCloseDeal?: () => void;
  onLoadReport?: () => void;
  report?: ProbeReport;
}

export function TopBar({ activeTab, onTabChange, callStatus, onCloseDeal, onLoadReport, report }: TopBarProps) {
  return (
    <header className="shrink-0 bg-surface border-b border-[var(--color-border)] flex flex-col">
      {/* Brand row */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-base font-semibold text-heading tracking-tight">
            Legal Growth Dashboard
          </span>
        </div>
        <div className="flex items-center gap-3">
          {callStatus === "active" && (
            <DotBadge color="green" label="Closer Call Active" />
          )}
          {/* Icon buttons */}
          <button
            onClick={onLoadReport}
            aria-label="load report"
            title="Load probe report"
            className="w-8 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md active:nm-inset transition-all duration-200 flex items-center justify-center text-subtle text-sm"
          >
            📁
          </button>
          {report && <ShareButton report={report} variant="icon" />}
          {(["history", "user"] as const).map((icon) => (
            <button
              key={icon}
              aria-label={icon}
              className="w-8 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md active:nm-inset transition-all duration-200 flex items-center justify-center text-subtle text-sm"
            >
              {icon === "history" && "⟳"}
              {icon === "user"    && "○"}
            </button>
          ))}
          <CTAButton size="sm" onClick={onCloseDeal}>
            Close Deal
          </CTAButton>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex items-end px-6 border-t border-[var(--color-border)]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={[
                "px-4 py-3 text-sm font-medium transition-colors duration-150",
                "rounded-t-[8px] -mb-px border-b-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                isActive
                  ? "text-brand border-brand"
                  : "text-subtle border-transparent hover:text-heading hover:border-[var(--color-border-strong)]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
