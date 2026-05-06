import type { LeadQueueItem, LeadStatus } from "../../lib/leadQueue";

interface PipelineViewProps {
  leads: LeadQueueItem[];
  loading: boolean;
  currentUserId: string;
  onOpen: (lead: LeadQueueItem) => void;
}

interface Column {
  key: string;
  label: string;
  matches: (s: LeadStatus) => boolean;
  accent: string;
}

const COLUMNS: Column[] = [
  {
    key: "open",
    label: "Open",
    matches: (s) => s === "open",
    accent: "border-t-brand",
  },
  {
    key: "in_progress",
    label: "In Progress",
    matches: (s) => s === "in_progress" || s === "no_decision",
    accent: "border-t-[#F59E0B]",
  },
  {
    key: "follow_up",
    label: "Follow-up / Callback",
    matches: (s) => s === "follow_up" || s === "callback",
    accent: "border-t-[#6366F1]",
  },
  {
    key: "won",
    label: "Won",
    matches: (s) => s === "won",
    accent: "border-t-[var(--color-success)]",
  },
  {
    key: "lost",
    label: "Lost",
    matches: (s) => s === "lost" || s === "not_interested",
    accent: "border-t-[var(--color-danger)]",
  },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function PipelineView({ leads, loading, currentUserId, onOpen }: PipelineViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-subtle animate-pulse">Loading pipeline…</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-3 -mx-2 px-2 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const inCol = leads.filter((l) => col.matches(l.status));
        return (
          <div
            key={col.key}
            className={[
              "min-w-[200px] flex flex-col bg-surface rounded-[8px] border border-[var(--color-border)] border-t-4",
              col.accent,
            ].join(" ")}
          >
            <header className="px-3 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
              <span className="text-2xs uppercase tracking-wider font-semibold text-heading">
                {col.label}
              </span>
              <span className="text-2xs tabular-nums text-subtle font-medium">
                {inCol.length}
              </span>
            </header>
            <div className="flex flex-col gap-2 p-2 max-h-[70vh] overflow-y-auto scrollbar-thin">
              {inCol.length === 0 ? (
                <p className="text-2xs text-subtle text-center py-6">Empty</p>
              ) : (
                inCol.map((lead) => (
                  <PipelineCard
                    key={lead.assessmentId}
                    lead={lead}
                    currentUserId={currentUserId}
                    onOpen={() => onOpen(lead)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineCard({
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
  const claimedByMe = lead.claimedById === currentUserId;
  const claimedByOther = !!lead.claimedById && !claimedByMe;
  const overdue =
    lead.nextActionAt && new Date(lead.nextActionAt).getTime() < Date.now();

  return (
    <button
      onClick={onOpen}
      className="text-left bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm hover:shadow-md hover:border-[var(--color-border-strong)] transition-all duration-150 px-3 py-2"
    >
      <p className="text-xs font-semibold text-heading truncate">{firm.name}</p>
      {location && <p className="text-2xs text-subtle truncate mt-0.5">{location}</p>}

      <div className="flex flex-wrap gap-1 mt-1.5">
        {claimedByOther && (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30">
            🔒 {lead.claimedByName ?? "Locked"}
          </span>
        )}
        {claimedByMe && (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-brand/15 text-brand border border-brand/30">
            🔒 You
          </span>
        )}
        {overdue && (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/30">
            ⚠ Overdue
          </span>
        )}
        {lead.callCount > 1 && (
          <span className="text-[10px] text-subtle">· {lead.callCount} calls</span>
        )}
      </div>

      <p className="text-[10px] text-subtle mt-1.5">
        {lead.openerName ?? "—"} · {timeAgo(lead.lastActivityAt)} ago
      </p>
    </button>
  );
}
