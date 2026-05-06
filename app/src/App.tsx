import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { FirmBriefing } from "./components/mobile/FirmBriefing";
import { EmptyState } from "./components/EmptyState";
import { LoadReportDialog } from "./components/LoadReportDialog";
import { NewAssessmentDialog } from "./components/NewAssessmentDialog";
import { SignIn } from "./components/SignIn";
import { Logo } from "./components/ui/Logo";
import { MOCK_REPORT, MOCK_SESSION } from "./data/mock";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useAuth } from "./lib/auth";
import { recommendPackage } from "./lib/packages";
import { getActiveReport, saveReport } from "./lib/storage";
import { clearHash, readReportFromHash } from "./lib/share";
import type { ProbeReport } from "./types";

export default function App() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { session, loading: authLoading } = useAuth();
  const [report, setReport] = useState<ProbeReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [probeOpen, setProbeOpen] = useState(false);
  const [loadingHash, setLoadingHash] = useState(true);

  // Must stay above all early returns — Rules of Hooks
  const recommendation = useMemo(
    () => (report ? recommendPackage(report) : null),
    [report],
  );

  // On mount (and after sign-in): prefer ?#data= hash share, then fall back
  // to the user's active assessment in Supabase.
  useEffect(() => {
    if (authLoading || !session) {
      setLoadingHash(false);
      return;
    }
    let cancelled = false;
    setLoadingHash(true);
    (async () => {
      const fromHash = await readReportFromHash();
      if (cancelled) return;
      if (fromHash) {
        await saveReport(fromHash);
        setReport(fromHash);
        clearHash();
        setLoadingHash(false);
        return;
      }
      const active = await getActiveReport();
      if (!cancelled && active) setReport(active.report);
      if (!cancelled) setLoadingHash(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, session]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface">
        <Logo variant="full" size={96} className="animate-pulse" />
        <p className="text-sm text-subtle">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <SignIn />;
  }

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
        <EmptyState
          onLoadReport={() => setDialogOpen(true)}
          onNewAssessment={() => setProbeOpen(true)}
        />
        <LoadReportDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onLoaded={handleLoaded}
          onUseMock={handleUseMock}
        />
        <NewAssessmentDialog
          open={probeOpen}
          onClose={() => setProbeOpen(false)}
          onLoaded={handleLoaded}
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
        onNewAssessment={() => setProbeOpen(true)}
      />
      <LoadReportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onLoaded={handleLoaded}
        onUseMock={handleUseMock}
      />
      <NewAssessmentDialog
        open={probeOpen}
        onClose={() => setProbeOpen(false)}
        onLoaded={handleLoaded}
      />
    </>
  );
}
