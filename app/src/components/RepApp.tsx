import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./layout/AppShell";
import { FirmBriefing } from "./mobile/FirmBriefing";
import { EmptyState } from "./EmptyState";
import { LoadReportDialog } from "./LoadReportDialog";
import { NewAssessmentDialog } from "./NewAssessmentDialog";
import { SignIn } from "./SignIn";
import { Logo } from "./ui/Logo";
import { MOCK_REPORT } from "../data/mock";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useAuth } from "../lib/auth";
import { recommendPackage } from "../lib/packages";
import { getActiveReport, saveReport } from "../lib/storage";
import { clearHash, readReportFromHash } from "../lib/share";
import type { ProbeReport } from "../types";

export default function RepApp() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { session, profile, loading: authLoading } = useAuth();
  const [report, setReport] = useState<ProbeReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [probeOpen, setProbeOpen] = useState(false);
  const [loadingHash, setLoadingHash] = useState(true);

  const recommendation = useMemo(
    () => (report ? recommendPackage(report) : null),
    [report],
  );

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

  // Redirect admins and closers to their dedicated portals
  if (profile?.role === "admin") {
    window.location.replace("/admin");
    return null;
  }
  if (profile?.role === "closer") {
    window.location.replace("/closers");
    return null;
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
        session={{ status: "idle", objections: [], closingTriggers: [], notes: "" }}
        onLoadReport={() => setDialogOpen(true)}
        onNewAssessment={() => setProbeOpen(true)}
        userName={profile?.full_name ?? profile?.email ?? undefined}
        userRole={profile?.role ?? undefined}
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
