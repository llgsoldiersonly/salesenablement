import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_ORDER,
  listLeads,
  updateLead,
  updateLeadStatus,
  type LeadStatus,
  type LeadWithAssessment,
} from "../lib/leads";
import { SignIn } from "./SignIn";
import { Logo } from "./ui/Logo";
import { statusStyle } from "./leads/StatusBadge";
import { LeadsTableView } from "./leads/LeadsTableView";
import { LeadsKanbanView } from "./leads/LeadsKanbanView";
import { LeadDetailDrawer } from "./leads/LeadDetailDrawer";

type ViewMode = "spreadsheet" | "kanban";

const VIEW_STORAGE_KEY = "llg.leadsView.v1";

function readStoredView(): ViewMode {
  if (typeof window === "undefined") return "spreadsheet";
  const v = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return v === "kanban" ? "kanban" : "spreadsheet";
}

export function LeadsApp() {
  const { session, profile, role, loading, signOut } = useAuth();
  const [view, setView] = useState<ViewMode>(() => readStoredView());
  const [leads, setLeads] = useState<LeadWithAssessment[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [activeLead, setActiveLead] = useState<LeadWithAssessment | null>(null);

  // Load leads
  const refresh = useCallback(async () => {
    setLoadingLeads(true);
    const rows = await listLeads();
    setLeads(rows);
    setLoadingLeads(false);
  }, []);

  useEffect(() => {
    if (session) void refresh();
  }, [session, refresh]);

  // Persist view choice
  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  // Derived: stage counts (computed against the full list, before filters)
  const stageCounts = useMemo(() => {
    const counts: Record<LeadStatus, number> = {} as Record<LeadStatus, number>;
    for (const s of LEAD_STATUS_ORDER) counts[s] = 0;
    for (const l of leads) counts[l.status]++;
    return counts;
  }, [leads]);

  // Derived: filtered list
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          l.firm_name,
          l.firm_url,
          l.firm_city,
          l.firm_state,
          l.firm_practice_area,
          l.contact_name,
          l.contact_email,
          l.decision_maker_name,
          ...l.tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, statusFilter]);

  // Mutations — optimistic UI then refresh on failure
  const handleStatusChange = useCallback(
    async (leadId: string, status: LeadStatus) => {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status, status_changed_at: new Date().toISOString() } : l)),
      );
      if (activeLead?.id === leadId) {
        setActiveLead({ ...activeLead, status, status_changed_at: new Date().toISOString() });
      }
      const result = await updateLeadStatus(leadId, status);
      if (!result) await refresh();
    },
    [activeLead, refresh],
  );

  const handleTogglePin = useCallback(
    async (leadId: string, pinned: boolean) => {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, pinned } : l)));
      if (activeLead?.id === leadId) {
        setActiveLead({ ...activeLead, pinned });
      }
      const result = await updateLead(leadId, { pinned });
      if (!result) await refresh();
    },
    [activeLead, refresh],
  );

  // ── Guards ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface">
        <Logo variant="full" size={96} className="animate-pulse" />
        <p className="text-sm text-subtle">Loading…</p>
      </div>
    );
  }
  if (!session) {
    return <SignIn portalName="Leads Portal" redirectPath="/leads" />;
  }
  if (role !== "opener" && role !== "closer" && role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface p-4">
        <Logo variant="full" size={64} />
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-heading mt-4">No role assigned</h2>
          <p className="text-sm text-subtle mt-2">
            Ask an admin to assign you a sales role to access this portal.
          </p>
          <button onClick={() => void signOut()} className="mt-4 text-sm text-brand hover:underline">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <header className="shrink-0 bg-surface border-b border-[var(--color-border)] px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Logo size={32} />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-heading">Leads Portal</span>
            <span className="ml-2 text-2xs uppercase tracking-wider text-brand font-semibold">
              Sales Enablement
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a href="/" className="hidden sm:inline text-xs text-subtle hover:text-body transition-colors">
            → Rep Dashboard
          </a>
          {(role === "closer" || role === "admin") && (
            <a href="/closers" className="hidden sm:inline text-xs text-subtle hover:text-body transition-colors">
              → Closer
            </a>
          )}
          {role === "admin" && (
            <a href="/admin" className="hidden sm:inline text-xs text-subtle hover:text-body transition-colors">
              → Admin
            </a>
          )}
          <div className="hidden sm:block h-4 w-px bg-[var(--color-border)]" />
          <span className="hidden md:inline text-xs text-subtle truncate max-w-[160px]">
            {profile?.full_name ?? profile?.email}
          </span>
          <button
            onClick={() => void signOut()}
            className="text-xs text-subtle hover:text-[var(--color-danger)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Controls bar */}
      <div className="shrink-0 bg-surface border-b border-[var(--color-border)] px-3 sm:px-6 py-2.5 flex flex-col gap-2.5">
        {/* Top row: search + view toggle + refresh */}
        <div className="flex items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Search firm, contact, tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-md bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-sm text-body outline-none focus:ring-2 focus:ring-brand"
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => void refresh()}
              className="hidden sm:inline-flex w-8 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md items-center justify-center text-subtle text-sm"
              title="Refresh"
              aria-label="refresh"
            >
              ⟳
            </button>
            <div className="flex rounded-[8px] border border-[var(--color-border)] overflow-hidden">
              <button
                onClick={() => setView("spreadsheet")}
                className={[
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  view === "spreadsheet" ? "bg-brand text-white" : "text-subtle hover:text-heading bg-surface",
                ].join(" ")}
              >
                Spreadsheet
              </button>
              <button
                onClick={() => setView("kanban")}
                className={[
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  view === "kanban" ? "bg-brand text-white" : "text-subtle hover:text-heading bg-surface",
                ].join(" ")}
              >
                Kanban
              </button>
            </div>
          </div>
        </div>

        {/* Stage chips — click to filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin -mx-1 px-1 pb-1">
          <StageChip
            label="All"
            count={leads.length}
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          {LEAD_STATUS_ORDER.map((s) => (
            <StageChip
              key={s}
              status={s}
              label={LEAD_STATUS_LABEL[s]}
              count={stageCounts[s]}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {loadingLeads ? (
          <div className="flex-1 flex items-center justify-center text-sm text-subtle">
            Loading leads…
          </div>
        ) : leads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-8">
            <p className="text-sm text-heading font-medium">No leads yet</p>
            <p className="text-xs text-subtle max-w-sm">
              When an assessment is created from the Rep Dashboard, a lead automatically appears here.
            </p>
            <a href="/" className="mt-2 text-xs text-brand hover:underline">
              → Go to Rep Dashboard
            </a>
          </div>
        ) : view === "spreadsheet" ? (
          <LeadsTableView
            leads={filtered}
            onOpenLead={setActiveLead}
            onStatusChange={handleStatusChange}
            onTogglePin={handleTogglePin}
          />
        ) : (
          <LeadsKanbanView leads={filtered} onOpenLead={setActiveLead} />
        )}
      </main>

      {/* Detail drawer */}
      {activeLead && (
        <LeadDetailDrawer
          lead={activeLead}
          onClose={() => setActiveLead(null)}
          onStatusChange={(next) => handleStatusChange(activeLead.id, next)}
          onTogglePin={(next) => handleTogglePin(activeLead.id, next)}
        />
      )}
    </div>
  );
}

interface StageChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  status?: LeadStatus;
}

function StageChip({ label, count, active, onClick, status }: StageChipProps) {
  const style = status ? statusStyle(status) : null;
  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
        "ring-1 ring-inset",
        active
          ? "bg-brand text-white ring-brand shadow-sm"
          : style
            ? `${style.bg} ${style.text} ${style.ring}`
            : "bg-surface text-subtle ring-[var(--color-border)] hover:text-heading",
      ].join(" ")}
    >
      {style && !active && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      <span>{label}</span>
      <span className={active ? "opacity-80" : "text-subtle"}>{count}</span>
    </button>
  );
}
