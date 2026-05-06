import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { getCloserHistory, type HistoryCall, type CloserStats, type CallOutcome } from "../../lib/closerHistory";

function historyToCsv(calls: HistoryCall[]): string {
  const header = [
    "started_at", "firm_name", "city", "state",
    "outcome", "package_sold", "contract_value_dollars",
    "duration_seconds", "objections", "triggers", "notes",
  ];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join("|") : String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const rows = calls.map((c) => [
    c.startedAt, c.firmName, c.firmCity, c.firmState,
    c.outcome ?? "", c.packageSold ?? "",
    c.contractValueCents != null ? (c.contractValueCents / 100).toFixed(2) : "",
    c.durationSeconds ?? "",
    c.objectionsHit ?? [], c.triggersHit ?? [],
    c.notes ?? "",
  ].map(escape).join(","));
  return [header.join(","), ...rows].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface CallHistoryProps {
  currentUserId: string;
}

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  closed_won:          "Won",
  closed_lost:         "Lost",
  follow_up_scheduled: "Follow-up",
  no_decision:         "No Decision",
  callback_requested:  "Callback",
  not_interested:      "Not Interested",
};

const OUTCOME_COLORS: Record<CallOutcome, string> = {
  closed_won:          "bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30",
  closed_lost:         "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30",
  follow_up_scheduled: "bg-[#6366F1]/15 text-[#4338CA] border-[#6366F1]/30",
  no_decision:         "bg-surface text-subtle border-[var(--color-border)]",
  callback_requested:  "bg-[#0EA5E9]/15 text-[#0369A1] border-[#0EA5E9]/30",
  not_interested:      "bg-surface text-subtle border-[var(--color-border)]",
};

function formatCents(cents: number): string {
  if (cents === 0) return "$0";
  if (cents >= 100_000_000) return `$${(cents / 100_000_000).toFixed(1)}M`;
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(1)}k`;
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s > 0 ? `${s}s` : ""}`.trim();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: "success" | "danger" | "brand";
}) {
  const cls =
    color === "success" ? "text-[var(--color-success)]"
    : color === "danger" ? "text-[var(--color-danger)]"
    : color === "brand"  ? "text-brand"
    : "text-heading";
  return (
    <div className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm px-4 py-4 text-center">
      <p className={`text-2xl font-semibold tabular-nums ${cls}`}>{value}</p>
      <p className="text-2xs text-subtle uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function CallCard({ call }: { call: HistoryCall }) {
  const [expanded, setExpanded] = useState(false);
  const location = [call.firmCity, call.firmState].filter(Boolean).join(", ");

  return (
    <div className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-bg-subtle)] transition-colors"
      >
        {/* Outcome badge */}
        <span
          className={[
            "shrink-0 text-2xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded border",
            call.outcome ? OUTCOME_COLORS[call.outcome] : "bg-surface text-subtle border-[var(--color-border)]",
          ].join(" ")}
        >
          {call.outcome ? OUTCOME_LABELS[call.outcome] : "No outcome"}
        </span>

        {/* Firm info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-heading truncate">{call.firmName}</p>
          {location && <p className="text-xs text-subtle truncate">{location}</p>}
        </div>

        {/* Right: value, duration, time */}
        <div className="flex items-center gap-4 shrink-0 text-right">
          {call.outcome === "closed_won" && call.contractValueCents != null && call.contractValueCents > 0 && (
            <div>
              <p className="text-sm font-semibold text-[var(--color-success)]">
                {formatCents(call.contractValueCents)}
              </p>
              <p className="text-2xs text-subtle uppercase">Revenue</p>
            </div>
          )}
          {call.durationSeconds != null && call.durationSeconds > 0 && (
            <div>
              <p className="text-sm font-semibold text-heading">
                {formatDuration(call.durationSeconds)}
              </p>
              <p className="text-2xs text-subtle uppercase">Duration</p>
            </div>
          )}
          <div>
            <p className="text-xs text-subtle">{timeAgo(call.startedAt)}</p>
          </div>
        </div>

        <span className="text-subtle text-xs ml-2">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-bg-subtle)] flex flex-col gap-3">
          <div className="flex gap-6 flex-wrap">
            {call.packageSold && (
              <div>
                <p className="text-2xs text-subtle uppercase tracking-wider mb-0.5">Package</p>
                <p className="text-sm font-medium text-heading">{call.packageSold}</p>
              </div>
            )}
            {call.durationSeconds != null && call.durationSeconds > 0 && (
              <div>
                <p className="text-2xs text-subtle uppercase tracking-wider mb-0.5">Call Length</p>
                <p className="text-sm font-medium text-heading">{formatDuration(call.durationSeconds)}</p>
              </div>
            )}
            {call.endedAt && (
              <div>
                <p className="text-2xs text-subtle uppercase tracking-wider mb-0.5">Date</p>
                <p className="text-sm text-body">
                  {new Date(call.startedAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {call.objectionsHit && call.objectionsHit.length > 0 && (
            <div>
              <p className="text-2xs text-subtle uppercase tracking-wider mb-1">Objections Hit</p>
              <div className="flex gap-1 flex-wrap">
                {call.objectionsHit.map((o) => (
                  <span key={o} className="text-2xs bg-surface border border-[var(--color-border)] rounded px-1.5 py-0.5 text-body">
                    {o.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {call.notes && (
            <div>
              <p className="text-2xs text-subtle uppercase tracking-wider mb-1">Notes</p>
              <p className="text-xs text-body leading-relaxed whitespace-pre-wrap">{call.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CallHistory({ currentUserId }: CallHistoryProps) {
  const [calls, setCalls] = useState<HistoryCall[]>([]);
  const [stats, setStats] = useState<CloserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void getCloserHistory(currentUserId).then(({ calls: c, stats: s }) => {
      setCalls(c);
      setStats(s);
      setLoading(false);
    });
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-subtle animate-pulse">Loading call history…</p>
      </div>
    );
  }

  const handleExport = () => {
    const csv = historyToCsv(calls);
    const ts = new Date().toISOString().slice(0, 10);
    downloadCsv(`my-calls-${ts}.csv`, csv);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Stat tiles + export */}
      {stats && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-5 gap-3">
            <StatTile label="Total Calls" value={stats.totalCalls} />
            <StatTile label="Closed Won" value={stats.won} color="success" />
            <StatTile label="Closed Lost" value={stats.lost} color="danger" />
            <StatTile
              label="Win Rate"
              value={`${stats.winRate}%`}
              color={stats.totalCalls === 0 ? undefined : stats.winRate >= 30 ? "success" : "danger"}
            />
            <StatTile label="My Revenue" value={formatCents(stats.revenueCents)} color="brand" />
          </div>
          {calls.length > 0 && (
            <div className="flex justify-end">
              <Button variant="neutral" size="sm" onClick={handleExport}>
                Export CSV
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Call list */}
      {calls.length === 0 ? (
        <div className="border border-dashed border-[var(--color-border-strong)] rounded-[8px] p-10 text-center bg-surface">
          <p className="text-sm text-heading font-medium">No calls logged yet.</p>
          <p className="text-xs text-subtle mt-1">
            Pick a lead from the queue and use End Call to log your first call.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {calls.map((call) => (
            <CallCard key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}
