import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { FirmBriefing } from "./components/mobile/FirmBriefing";
import { EmptyState } from "./components/EmptyState";
import { LoadReportDialog } from "./components/LoadReportDialog";
import { Logo } from "./components/ui/Logo";
import { MOCK_REPORT, MOCK_SESSION } from "./data/mock";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { recommendPackage } from "./lib/packages";
import { getActiveReport, saveReport } from "./lib/storage";
import { clearHash, readReportFromHash } from "./lib/share";
import type { ProbeReport } from "./types";

export default function App() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [report, setReport] = useState<ProbeReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingHash, setLoadingHash] = useState(true);

  // On mount: prefer ?#data= hash share, then fall back to localStorage active.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromHash = await readReportFromHash();
      if (cancelled) return;
      if (fromHash) {
        // Persist the shared report locally so the rep can come back to it.
        saveReport(fromHash);
        setReport(fromHash);
        clearHash();
        setLoadingHash(false);
        return;
      }
      const active = getActiveReport();
      if (active) setReport(active.report);
      setLoadingHash(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (loadingHash) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface">
        <Logo variant="full" size={96} className="animate-pulse" />
        <p className="text-sm text-subtle">Loading…</p>
      </div>
    );
  }

  if (!report) {
    if (isMobile) {
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
    return <FirmBriefing report={report} recommendation={recommendation!} />;
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
