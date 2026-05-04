import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { FirmBriefing } from "./components/mobile/FirmBriefing";
import { EmptyState } from "./components/EmptyState";
import { LoadReportDialog } from "./components/LoadReportDialog";
import { MOCK_REPORT, MOCK_SESSION } from "./data/mock";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { recommendPackage } from "./lib/packages";
import { getActiveReport } from "./lib/storage";
import type { ProbeReport } from "./types";

export default function App() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [report, setReport] = useState<ProbeReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load active report from localStorage on mount.
  useEffect(() => {
    const active = getActiveReport();
    if (active) setReport(active.report);
  }, []);

  // Recompute the recommendation deterministically from the report.
  const recommendation = useMemo(
    () => (report ? recommendPackage(report) : null),
    [report]
  );

  const handleUseMock = () => {
    setReport(MOCK_REPORT);
    setDialogOpen(false);
  };

  const handleLoaded = (r: ProbeReport) => {
    setReport(r);
    setDialogOpen(false);
  };

  // No report loaded → empty state on desktop, mock-on-mobile (closer needs the
  // briefing immediately when they tap the link from a notification).
  if (!report) {
    if (isMobile) {
      // Mobile defaults to demo data so the briefing is always tappable.
      return (
        <FirmBriefing
          report={MOCK_REPORT}
          recommendation={recommendPackage(MOCK_REPORT)}
        />
      );
    }
    return (
      <>
        <EmptyState onLoadReport={() => setDialogOpen(true)} />
        <LoadReportDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onLoaded={handleLoaded}
          onUseMock={handleUseMock}
        />
      </>
    );
  }

  if (isMobile) {
    return (
      <FirmBriefing report={report} recommendation={recommendation!} />
    );
  }

  return (
    <>
      <AppShell
        report={report}
        recommendation={recommendation!}
        session={MOCK_SESSION}
        onLoadReport={() => setDialogOpen(true)}
      />
      <LoadReportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onLoaded={handleLoaded}
        onUseMock={handleUseMock}
      />
    </>
  );
}
