import { useEffect, useMemo, useState } from "react";
import { Button, CTAButton } from "../ui/Button";
import { Logo } from "../ui/Logo";
import { getLeadQueue, type LeadQueueItem, type LeadStatus } from "../../lib/leadQueue";
import { CallHistory } from "./CallHistory";
import { CoachingView } from "./CoachingView";
import { setActiveReport } from "../../lib/storage";
import type { ProbeReport } from "../../types";

type TopView = "queue" | "history" | "coaching";

interface LeadQueueProps {
  currentUserId: string;
  currentUserName: string;
  onOpenLead: (report: ProbeReport) => void;
  onLoadReport: () => void;
  onNewAssessment: () => void;
  onSignOut: () => void;
}

type FilterKey = "open" | "mine" | "all" | "won" | "lost";

const STATUS_LABELS: Record<LeadStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  won: "Won",
  lost: "Lost",
  follow_up: "Follow-up",
  no_decision: "No Decision",
  callback: "Callback",
  not_interested: "Not Interested",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  open: "bg-brand/15 text-brand border-brand/30",
  in_progress: "bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30",
  won: "bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30",
  lost: "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30",
  follow_up: "bg-[#6366F1]/15 text-[#4338CA] border-[#6366F1]/30",
  no_decision: "bg-surface text-subtle border-[var(--color-border)]",
  callback: "bg-[#0EA5E9]/15 text-[#0369A1] border-[#0EA5E9]/30",
  not_interested: "bg-surface text-subtle border-[var(--color-border)]",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function LeadQueue({
  currentUserId,
  currentUserName,
  onOpenLead,
  onLoadReport,
  onNewAssessment,
  onSignOut,
}: LeadQueueProps) {
  const [topView, setTopView] = useState<TopView>("queue");
  const [leads, setLeads] = useState<LeadQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("open");

  const reload = async () => {
    setLoading(true);
    setLeads(await getLeadQueue(50));
    setLoading(false);
  };

  useEffect(() => { void reload(); }, []);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { open: 0, mine: 0, all: leads.length, won: 0, lost: 0 };
    leads.forEach((l) => {
      if (l.status === "open") c.open += 1;
      if (l.lastCallCloserId === currentUserId) c.mine += 1;
      if (l.status === "won") c.won += 1;
      if (l.status === "lost") c.lost += 1;
    });
    return c;
  }, [leads, currentUserId]);

  const visible = useMemo(() => {
    switch (filter) {
      case "open":  return leads.filter((l) => l.status === "open");
      case "mine":  return leads.filter((l) => l.lastCallCloserId === currentUserId);
      case "won":   return leads.filter((l) => l.status === "won");
      case "lost":  return leads.filter((l) => l.status === "lost");
      case "all":   return leads;
    }
  }, [leads, filter, currentUserId]);

  const handleOpen = (lead: LeadQueueItem) => {
    setActiveReport(lead.assessmentId);
    onOpenLead(lead.report);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <div>
            <span className="text-sm font-semibold text-heading">Closer Portal</span>
            <span className="ml-2 text-2xs uppercase tracking-wider text-brand font-semibold">
              Lead Queue
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Top-level view toggle */}
          <div className="flex rounded-[8px] border border-[var(--color-border)] overflow-hidden">
            {(["queue", "history", "coaching"] as TopView[]).map((v) => (
              <button
                key={v}
                onClick={() => setTopView(v)}
                className={[
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  topView === v
                    ? "bg-brand text-white"
                    : "text-subtle hover:text-heading bg-surface",
                ].join(" ")}
              >
                {v === "queue" ? "Lead Queue" : v === "history" ? "My Calls" : "Coaching"}
              </button>
            ))}
          </div>
          <span className="text-xs text-subtle">{currentUserName}</span>
          <button
            onClick={onSignOut}
            className="text-xs text-subtle hover:text-[var(--color-danger)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-5">
        {/* Title bar */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-heading">
              {topView === "queue" ? "Lead Queue" : topView === "history" ? "My Calls" : "Coaching"}
            </h1>
            <p className="text-sm text-subtle mt-0.5">
              {topView === "queue"
                ? (loading ? "loading…" : `${counts.open} open · ${leads.length} total`)
                : topView === "history"
                  ? "Your call history and performance"
                  : "Notes from your manager"}
            </p>
          </div>
          {topView === "queue" && (
            <div className="flex items-center gap-2">
              <Button variant="neutral" size="sm" onClick={() => void reload()} disabled={loading}>
                {loading ? "…" : "Refresh"}
              </Button>
              <Button variant="neutral" size="sm" onClick={onLoadReport}>
                Load Saved
              </Button>
              <CTAButton size="sm" onClick={onNewAssessment}>
                New Assessment
              </CTAButton>
            </div>
          )}
        </div>

        {/* History view */}
        {topView === "history" && (
          <CallHistory currentUserId={currentUserId} />
        )}

        {/* Coaching view */}
        {topView === "coaching" && (
          <CoachingView currentUserId={currentUserId} />
        )}

        {/* Queue view — filter pills + lead list */}
        {topView === "queue" && (
          <>
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  ["open", "Open"],
                  ["mine", "My Calls"],
                  ["all", "All"],
                  ["won", "Won"],
                  ["lost", "Lost"],
                ] as Array<[FilterKey, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={[
                    "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
                    filter === key
                      ? "bg-brand text-white border-brand"
                      : "bg-surface text-body border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
                  ].join(" ")}
                >
                  {label}
                  <span
                    className={[
                      "ml-1.5 text-2xs tabular-nums",
                      filter === key ? "text-white/80" : "text-subtle",
                    ].join(" ")}
                  >
                    {counts[key]}
                  </span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm text-subtle animate-pulse">Loading leads…</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="border border-dashed border-[var(--color-border-strong)] rounded-[8px] p-10 text-center bg-surface">
                <p className="text-sm text-heading font-medium">No leads in this view.</p>
                <p className="text-xs text-subtle mt-1">
                  {filter === "open"
                    ? "Every assessment has a logged call. Try All or run a new assessment."
                    : filter === "mine"
                      ? "You haven't logged any calls yet."
                      : "Try a different filter or run a new assessment."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {visible.map((lead) => (
                  <LeadCard key={lead.assessmentId} lead={lead} onOpen={() => handleOpen(lead)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LeadCard({ lead, onOpen }: { lead: LeadQueueItem; onOpen: () => void }) {
  const firm = lead.report.firm;
  const location = [firm.city, firm.state].filter(Boolean).join(", ");
  const subline = [location, firm.practiceArea].filter(Boolean).join(" · ");

  return (
    <div className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all duration-150 px-4 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-heading truncate">{firm.name}</h3>
          <span
            className={[
              "text-2xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded border",
              STATUS_COLORS[lead.status],
            ].join(" ")}
          >
            {STATUS_LABELS[lead.status]}
          </span>
          {lead.callCount > 1 && (
            <span className="text-2xs text-subtle">· {lead.callCount} calls</span>
          )}
        </div>
        {subline && (
          <p className="text-xs text-body truncate mt-0.5">{subline}</p>
        )}
        <p className="text-2xs text-subtle mt-0.5">
          Opened by{" "}
          <span className="font-medium text-body">{lead.openerName ?? "—"}</span>
          {" · "}
          {timeAgo(lead.createdAt)}
          {lead.coverageScore != null && (
            <>
              {" · "}coverage {lead.coverageScore}
            </>
          )}
          {lead.lastCallAt && (
            <>
              {" · "}last call {timeAgo(lead.lastCallAt)}
            </>
          )}
        </p>
      </div>
      <CTAButton size="sm" onClick={onOpen}>
        Open
      </CTAButton>
    </div>
  );
}
