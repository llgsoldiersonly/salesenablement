import { useEffect, useMemo, useState } from "react";
import { Button, CTAButton } from "../ui/Button";
import { Logo } from "../ui/Logo";
import { getLeadQueue, type LeadQueueItem, type LeadStatus } from "../../lib/leadQueue";
import { CallHistory } from "./CallHistory";
import { CoachingView } from "./CoachingView";
import { PipelineView } from "./PipelineView";
import { claimLead } from "../../lib/claims";
import { formatPhoneDisplay, phoneTelHref } from "../../lib/leadContact";
import { setActiveReport } from "../../lib/storage";
import { supabase } from "../../lib/supabase";
import { CalendarSyncDialog } from "../CalendarSyncDialog";
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

type FilterKey = "follow_ups" | "cold" | "open" | "mine" | "all" | "won" | "lost";

const STALE_DAYS = 7;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES: LeadStatus[] = ["open", "in_progress", "follow_up", "callback", "no_decision"];

function isStale(lead: LeadQueueItem): boolean {
  if (!ACTIVE_STATUSES.includes(lead.status)) return false;
  return Date.now() - new Date(lead.lastActivityAt).getTime() > STALE_MS;
}

function isFollowUp(lead: LeadQueueItem): boolean {
  if (!lead.nextActionAt) return false;
  return ACTIVE_STATUSES.includes(lead.status);
}

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
  const [layout, setLayout] = useState<"list" | "pipeline">("list");
  const [search, setSearch] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const reload = async () => {
    setLoading(true);
    const page = await getLeadQueue({ limit: 50 });
    setLeads(page.items);
    setHasMore(page.hasMore);
    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || leads.length === 0) return;
    setLoadingMore(true);
    const cursor = leads[leads.length - 1].createdAt;
    const page = await getLeadQueue({ limit: 50, before: cursor });
    setLeads((prev) => [...prev, ...page.items]);
    setHasMore(page.hasMore);
    setLoadingMore(false);
  };

  useEffect(() => { void reload(); }, []);

  // Live updates: any change to assessments, calls, or notes refreshes the queue.
  // Debounced so a burst of edits doesn't thrash the network.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void reload();
      }, 800);
    };
    const channel = supabase
      .channel("lead-queue-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_assessments" }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_calls" }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_assessment_notes" }, debounced)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      follow_ups: 0, cold: 0, open: 0, mine: 0, all: leads.length, won: 0, lost: 0,
    };
    leads.forEach((l) => {
      if (isFollowUp(l)) c.follow_ups += 1;
      if (isStale(l)) c.cold += 1;
      if (l.status === "open") c.open += 1;
      if (l.lastCallCloserId === currentUserId) c.mine += 1;
      if (l.status === "won") c.won += 1;
      if (l.status === "lost") c.lost += 1;
    });
    return c;
  }, [leads, currentUserId]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "follow_ups":
        return leads
          .filter(isFollowUp)
          .sort((a, b) => new Date(a.nextActionAt!).getTime() - new Date(b.nextActionAt!).getTime());
      case "cold":  return leads.filter(isStale);
      case "open":  return leads.filter((l) => l.status === "open");
      case "mine":  return leads.filter((l) => l.lastCallCloserId === currentUserId);
      case "won":   return leads.filter((l) => l.status === "won");
      case "lost":  return leads.filter((l) => l.status === "lost");
      case "all":   return leads;
    }
  }, [leads, filter, currentUserId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((l) => {
      const firm = l.report.firm;
      const haystack = [
        firm.name,
        firm.city,
        firm.state,
        firm.practiceArea,
        l.openerName,
        l.contactName,
        l.contactPhone,
        l.contactEmail,
        l.contactRole,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [filtered, search]);

  const handleOpen = async (lead: LeadQueueItem) => {
    const lockedByOther =
      lead.claimedById && lead.claimedById !== currentUserId;
    if (lockedByOther) {
      const proceed = confirm(
        `${lead.claimedByName ?? "Another rep"} is currently working this lead. Open anyway and take over the claim?`,
      );
      if (!proceed) return;
    }
    const result = await claimLead(lead.assessmentId, !!lockedByOther);
    if (!result.ok && result.reason === "already_claimed") {
      alert("Could not take over — please refresh and try again.");
      void reload();
      return;
    }
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
            onClick={() => setCalendarOpen(true)}
            className="text-xs text-subtle hover:text-heading transition-colors"
            title="Subscribe to follow-ups in your calendar"
          >
            📅 Calendar
          </button>
          <button
            onClick={onSignOut}
            className="text-xs text-subtle hover:text-[var(--color-danger)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <CalendarSyncDialog open={calendarOpen} onClose={() => setCalendarOpen(false)} />

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
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search firm, contact, opener…"
                className="w-56 bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-xs text-body outline-none focus:ring-2 focus:ring-brand placeholder:text-subtle"
              />
              <div className="flex rounded-[8px] border border-[var(--color-border)] overflow-hidden">
                {(["list", "pipeline"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setLayout(v)}
                    className={[
                      "px-2.5 py-1 text-xs font-medium transition-colors",
                      layout === v
                        ? "bg-brand text-white"
                        : "text-subtle hover:text-heading bg-surface",
                    ].join(" ")}
                  >
                    {v === "list" ? "List" : "Pipeline"}
                  </button>
                ))}
              </div>
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

        {/* Queue view — pipeline mode (no filter pills) */}
        {topView === "queue" && layout === "pipeline" && (
          <PipelineView
            leads={leads}
            loading={loading}
            currentUserId={currentUserId}
            onOpen={(l) => void handleOpen(l)}
          />
        )}

        {/* Queue view — list mode with filter pills */}
        {topView === "queue" && layout === "list" && (
          <>
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  ["follow_ups", "Follow-ups"],
                  ["cold", "Going Cold"],
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
                  {filter === "follow_ups"
                    ? "No leads have a scheduled follow-up. Closers set this on EndCall."
                    : filter === "cold"
                      ? `No active leads have been silent for ${STALE_DAYS}+ days.`
                      : filter === "open"
                        ? "Every assessment has a logged call. Try All or run a new assessment."
                        : filter === "mine"
                          ? "You haven't logged any calls yet."
                          : "Try a different filter or run a new assessment."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {visible.map((lead) => (
                  <LeadCard
                    key={lead.assessmentId}
                    lead={lead}
                    currentUserId={currentUserId}
                    onOpen={() => void handleOpen(lead)}
                  />
                ))}
                {hasMore && !search && (
                  <div className="flex justify-center py-2">
                    <Button
                      variant="neutral"
                      size="sm"
                      onClick={() => void loadMore()}
                      disabled={loadingMore}
                    >
                      {loadingMore ? "Loading…" : "Load more"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function nextActionLabel(iso: string): { label: string; overdue: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  const overdue = ms < 0;
  const absMs = Math.abs(ms);
  const mins = Math.floor(absMs / 60000);
  let rel: string;
  if (mins < 60) rel = `${mins}m`;
  else if (mins < 60 * 24) rel = `${Math.floor(mins / 60)}h`;
  else rel = `${Math.floor(mins / 60 / 24)}d`;
  return { label: overdue ? `${rel} overdue` : `due in ${rel}`, overdue };
}

function LeadCard({
  lead,
  currentUserId,
  onOpen,
}: {
  lead: LeadQueueItem;
  currentUserId: string;
  onOpen: () => void;
}) {
  const firm = lead.report.firm;
  const location = [firm.city, firm.state].filter(Boolean).join(", ");
  const subline = [location, firm.practiceArea].filter(Boolean).join(" · ");
  const stale = isStale(lead);
  const nextAction = isFollowUp(lead) ? nextActionLabel(lead.nextActionAt!) : null;
  const claimedByMe = lead.claimedById === currentUserId;
  const claimedByOther = !!lead.claimedById && !claimedByMe;

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
          {claimedByOther && (
            <span className="text-2xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30">
              🔒 {lead.claimedByName ?? "Locked"} · live
            </span>
          )}
          {claimedByMe && (
            <span className="text-2xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-brand/15 text-brand border-brand/30">
              🔒 You · resume
            </span>
          )}
          {nextAction && (
            <span
              className={[
                "text-2xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded border",
                nextAction.overdue
                  ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30"
                  : "bg-[#0EA5E9]/15 text-[#0369A1] border-[#0EA5E9]/30",
              ].join(" ")}
            >
              {nextAction.overdue ? "⚠ " : "⏰ "}
              {nextAction.label}
            </span>
          )}
          {stale && (
            <span className="text-2xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30">
              ❄ Cold
            </span>
          )}
          {lead.callCount > 1 && (
            <span className="text-2xs text-subtle">· {lead.callCount} calls</span>
          )}
        </div>
        {subline && (
          <p className="text-xs text-body truncate mt-0.5">{subline}</p>
        )}
        {(lead.contactName || lead.contactPhone) && (
          <p className="text-xs text-body mt-0.5 flex items-center gap-2 flex-wrap">
            {lead.contactName && (
              <span>
                <span aria-hidden="true">👤 </span>
                <span className="font-medium">{lead.contactName}</span>
                {lead.contactRole && <span className="text-subtle"> · {lead.contactRole}</span>}
              </span>
            )}
            {lead.contactPhone && (
              <a
                href={phoneTelHref(lead.contactPhone) ?? "#"}
                onClick={(e) => e.stopPropagation()}
                className="text-brand hover:underline tabular-nums font-medium"
              >
                📞 {formatPhoneDisplay(lead.contactPhone)}
              </a>
            )}
          </p>
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
        {claimedByMe ? "Resume" : claimedByOther ? "Take over" : "Open"}
      </CTAButton>
    </div>
  );
}
