import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { RightRail } from "./RightRail";
import { OverviewTab } from "../tabs/OverviewTab";
import { CalculatorTab } from "../tabs/CalculatorTab";
import { IntakeTab } from "../tabs/IntakeTab";
import { CompetitorsTab } from "../tabs/CompetitorsTab";
import { NotesTab } from "../tabs/NotesTab";
import { ActivityTab } from "../tabs/ActivityTab";
import { AdminTab } from "../tabs/AdminTab";
import { EndCallDialog } from "../EndCallDialog";
import { CalendarSyncDialog } from "../CalendarSyncDialog";
import type { CallSession, PackageRecommendation, ProbeReport, TabId } from "../../types";

interface AppShellProps {
  report: ProbeReport;
  recommendation: PackageRecommendation;
  session: CallSession;
  onLoadReport?: () => void;
  onNewAssessment?: () => void;
  onBackToQueue?: () => void;
  userName?: string;
  userRole?: string;
}

export function AppShell({ report, recommendation, session, onLoadReport, onNewAssessment, onBackToQueue, userName, userRole }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [activeNav, setActiveNav] = useState("prospect");
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [endCallPending, setEndCallPending] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar — hidden on mobile, drawer when open */}
        <div className="hidden md:flex">
          <Sidebar
            activeNav={activeNav}
            onNavChange={setActiveNav}
            firmName={report.firm.name}
            onNewAssessment={onNewAssessment}
            onBackToQueue={onBackToQueue}
            onOpenCalendar={() => setCalendarOpen(true)}
            userName={userName}
            userRole={userRole}
          />
        </div>
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
            <div className="fixed inset-y-0 left-0 z-50 md:hidden shadow-2xl">
              <Sidebar
                activeNav={activeNav}
                onNavChange={(id) => {
                  setActiveNav(id);
                  setSidebarOpen(false);
                }}
                firmName={report.firm.name}
                onNewAssessment={() => {
                  setSidebarOpen(false);
                  onNewAssessment?.();
                }}
                onBackToQueue={onBackToQueue ? () => {
                  setSidebarOpen(false);
                  onBackToQueue();
                } : undefined}
                onOpenCalendar={() => {
                  setSidebarOpen(false);
                  setCalendarOpen(true);
                }}
                userName={userName}
                userRole={userRole}
              />
            </div>
          </>
        )}

        {/* Main content area — hidden on mobile when call is active so cockpit takes over */}
        <main
          className={[
            "flex-1 overflow-hidden flex-col bg-surface",
            callActive ? "hidden md:flex" : "flex",
          ].join(" ")}
        >
          {activeTab === "overview"    && <OverviewTab    report={report} recommendation={recommendation} />}
          {activeTab === "intake"      && <IntakeTab      report={report} />}
          {activeTab === "competitors" && <CompetitorsTab report={report} />}
          {activeTab === "calculator"  && <CalculatorTab  firm={report.firm} />}
          {activeTab === "notes"       && <NotesTab />}
          {activeTab === "activity"    && <ActivityTab />}
          {activeTab === "admin"       && <AdminTab />}
        </main>

        {/* Right rail — hidden on mobile when idle; full-screen takeover when call active */}
        <div
          className={[
            callActive ? "flex flex-1 md:flex-initial" : "hidden md:flex",
          ].join(" ")}
        >
          <RightRail
            callActive={callActive}
            callStartedAt={callStartedAt}
            report={report}
            recommendation={recommendation}
            onEndCall={handleEndCall}
          />
        </div>
      </div>

      <EndCallDialog
        open={endCallPending}
        callStartedAt={callStartedAt ?? Date.now()}
        firmKey={firmKey}
        onDone={handleEndCallDone}
      />

      <CalendarSyncDialog open={calendarOpen} onClose={() => setCalendarOpen(false)} />

      {/* Footer */}
      <footer className="shrink-0 bg-surface border-t border-[var(--color-border)] px-6 py-2">
        <p className="text-2xs text-subtle text-center">
          Projections are estimates, not guarantees. Confidential — for internal
          use only. © {new Date().getFullYear()} Lucrative Legal Group.
        </p>
      </footer>
    </div>
  );
}
