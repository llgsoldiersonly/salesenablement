import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { RightRail } from "./RightRail";
import { OverviewTab } from "../tabs/OverviewTab";
import { CalculatorTab } from "../tabs/CalculatorTab";
import { IntakeTab } from "../tabs/IntakeTab";
import { CompetitorsTab } from "../tabs/CompetitorsTab";
import { NotesTab } from "../tabs/NotesTab";
import { AdminTab } from "../tabs/AdminTab";
import { EndCallDialog } from "../EndCallDialog";
import type { CallSession, PackageRecommendation, ProbeReport, TabId } from "../../types";

interface AppShellProps {
  report: ProbeReport;
  recommendation: PackageRecommendation;
  session: CallSession;
  onLoadReport?: () => void;
  onNewAssessment?: () => void;
}

export function AppShell({ report, recommendation, session, onLoadReport, onNewAssessment }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [activeNav, setActiveNav] = useState("prospect");
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [endCallPending, setEndCallPending] = useState(false);

  const callActive = callStartedAt != null;
  const callStatus: CallSession["status"] = callActive ? "active" : session.status;
  const firmKey = report.firm.url || report.firm.name;

  const handleStartCall = () => setCallStartedAt(Date.now());
  const handleEndCall = () => setEndCallPending(true);
  const handleEndCallDone = () => {
    setEndCallPending(false);
    setCallStartedAt(null);
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        callStatus={callStatus}
        onCloseDeal={callActive ? handleEndCall : handleStartCall}
        onLoadReport={onLoadReport}
        report={report}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeNav={activeNav}
          onNavChange={setActiveNav}
          firmName={report.firm.name}
          onNewAssessment={onNewAssessment}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-hidden flex flex-col bg-surface">
          {activeTab === "overview"    && <OverviewTab    report={report} recommendation={recommendation} />}
          {activeTab === "intake"      && <IntakeTab      report={report} />}
          {activeTab === "competitors" && <CompetitorsTab report={report} />}
          {activeTab === "calculator"  && <CalculatorTab  firm={report.firm} />}
          {activeTab === "notes"       && <NotesTab />}
          {activeTab === "admin"       && <AdminTab />}
        </main>

        <RightRail
          session={session}
          firmState={report.firm.state}
          callActive={callActive}
          callStartedAt={callStartedAt}
          report={report}
          recommendation={recommendation}
          onEndCall={handleEndCall}
        />
      </div>

      <EndCallDialog
        open={endCallPending}
        callStartedAt={callStartedAt ?? Date.now()}
        firmKey={firmKey}
        onDone={handleEndCallDone}
      />

      {/* Footer */}
      <footer className="shrink-0 bg-surface border-t border-[var(--color-border)] px-6 py-2 flex items-center justify-between">
        <div className="flex gap-4">
          {["Terms of Service", "Privacy Policy", "Compliance Shield"].map((link) => (
            <a key={link} href="#" className="text-2xs text-subtle hover:text-body transition-colors">
              {link}
            </a>
          ))}
        </div>
        <p className="text-2xs text-subtle text-center flex-1 px-4">
          Projection ≠ guarantee. Results based on algorithmic estimation and historical market
          data for {report.firm.name}® {new Date().getFullYear()} LegalMarketing Compliance.
          All information presented is confidential and for internal use only.
        </p>
      </footer>
    </div>
  );
}
