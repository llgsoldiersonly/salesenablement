import { useEffect, useMemo, useState } from "react";
import { SignIn } from "./SignIn";
import { AppShell } from "./layout/AppShell";
import { LeadQueue } from "./closer/LeadQueue";
import { LoadReportDialog } from "./LoadReportDialog";
import { NewAssessmentDialog } from "./NewAssessmentDialog";
import { Logo } from "./ui/Logo";
import { useAuth } from "../lib/auth";
import { recommendPackage } from "../lib/packages";
import { getActiveReport, saveReport } from "../lib/storage";
import { clearHash, readReportFromHash } from "../lib/share";
import type { ProbeReport } from "../types";

export function CloserApp() {
  const { session, profile, role, loading: authLoading, signOut } = useAuth();
  const [report, setReport] = useState<ProbeReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [probeOpen, setProbeOpen] = useState(false);
  const [loadingHash, setLoadingHash] = useState(true);

  const recommendation = useMemo(
    () => (report ? recommendPackage(report) : null),
    [report],
  );

  useEffect(() => {
    if (authLoading || !session) { setLoadingHash(false); return; }
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
    return () => { cancelled = true; };
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
    return <SignIn portalName="Closer Portal" redirectPath="/closers" />;
  }

  if (role !== "closer" && role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface p-4">
        <Logo variant="full" size={64} />
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-heading mt-4">Access Denied</h2>
          <p className="text-sm text-subtle mt-2">
            This portal is for closers only.{" "}
            {profile?.email && (
              <>
                You're signed in as{" "}
                <span className="font-medium text-body">{profile.email}</span> ({role ?? "no role"}).
              </>
            )}
          </p>
          <div className="flex gap-4 justify-center mt-4">
            <a href="/" className="text-sm text-brand hover:underline">
              Go to Rep Portal
            </a>
            <button
              onClick={() => void signOut()}
              className="text-sm text-subtle hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingHash) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface">
        <Logo variant="full" size={96} className="animate-pulse" />
        <p className="text-sm text-subtle">Loading…</p>
      </div>
    );
  }

  const handleLoaded = (r: ProbeReport) => { setReport(r); setDialogOpen(false); };

  if (!report) {
    return (
      <>
        <LeadQueue
          currentUserId={session.user.id}
          currentUserName={profile?.full_name ?? profile?.email ?? "Closer"}
          onOpenLead={(r) => setReport(r)}
          onLoadReport={() => setDialogOpen(true)}
          onNewAssessment={() => setProbeOpen(true)}
          onSignOut={() => void signOut()}
        />
        <LoadReportDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onLoaded={handleLoaded}
          onUseMock={() => { setDialogOpen(false); }}
        />
        <NewAssessmentDialog
          open={probeOpen}
          onClose={() => setProbeOpen(false)}
          onLoaded={handleLoaded}
        />
      </>
    );
  }

  return (
    <>
      <AppShell
        report={report}
        recommendation={recommendation!}
        session={{ status: "idle", objections: [], closingTriggers: [], notes: "" }}
        onLoadReport={() => setDialogOpen(true)}
        onNewAssessment={() => setProbeOpen(true)}
        onBackToQueue={() => {
          localStorage.removeItem("llg.activeAssessment.v2");
          setReport(null);
        }}
        userName={profile?.full_name ?? profile?.email ?? undefined}
        userRole={profile?.role ?? undefined}
      />
      <LoadReportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onLoaded={handleLoaded}
        onUseMock={() => { setDialogOpen(false); }}
      />
      <NewAssessmentDialog
        open={probeOpen}
        onClose={() => setProbeOpen(false)}
        onLoaded={handleLoaded}
      />
    </>
  );
}
