import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import {
  callsToCsv,
  getCallsLibrary,
  type CallOutcome,
  type LibraryCall,
} from "../../lib/callsLibrary";
import { getAllProfiles } from "../../lib/adminStats";
import type { SalesProfile } from "../../lib/auth";

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  closed_won: "Won",
  closed_lost: "Lost",
  follow_up_scheduled: "Follow-up",
  no_decision: "No decision",
  not_interested: "Not interested",
  callback_requested: "Callback",
};

function formatDuration(s: number | null): string {
  if (!s) return "—";
  const m = Math.round(s / 60);
  return `${m}m`;
}

function formatCents(c: number | null): string {
  if (!c) return "—";
  return `$${Math.round(c / 100).toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

export function CallsLibraryView() {
  const [calls, setCalls] = useState<LibraryCall[]>([]);
  const [profiles, setProfiles] = useState<SalesProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [closerId, setCloserId] = useState<string>("");
  const [outcome, setOutcome] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    const [c, p] = await Promise.all([
      getCallsLibrary({
        closerId: closerId || null,
        outcome: (outcome as CallOutcome) || null,
        fromDate: fromDate ? new Date(fromDate).toISOString() : null,
        toDate: toDate ? new Date(toDate + "T23:59:59").toISOString() : null,
      }),
      profiles.length > 0 ? Promise.resolve(profiles) : getAllProfiles(),
    ]);
    setCalls(c);
    if (profiles.length === 0) setProfiles(p);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closerId, outcome, fromDate, toDate]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return calls;
    return calls.filter((c) => {
      const haystack = [
        c.firmName, c.firmCity, c.firmState,
        c.closerName, c.openerName,
        c.notes, c.packageSold,
        ...(c.objectionsHit ?? []),
        ...(c.triggersHit ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [calls, search]);

  const handleExport = () => {
    const csv = callsToCsv(visible);
    const ts = new Date().toISOString().slice(0, 10);
    downloadCsv(`calls-${ts}.csv`, csv);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search firm, notes, objections…"
          className="flex-1 min-w-[200px] bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-xs text-body outline-none focus:ring-2 focus:ring-brand placeholder:text-subtle"
        />
        <select
          value={closerId}
          onChange={(e) => setCloserId(e.target.value)}
          className="bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-2 py-1.5 text-xs"
        >
          <option value="">All closers</option>
          {profiles.filter((p) => p.role !== "opener").map((p) => (
            <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>
          ))}
        </select>
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-2 py-1.5 text-xs"
        >
          <option value="">All outcomes</option>
          {Object.entries(OUTCOME_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-2 py-1.5 text-xs"
        />
        <span className="text-2xs text-subtle">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-2 py-1.5 text-xs"
        />
        <Button variant="neutral" size="sm" onClick={handleExport} disabled={visible.length === 0}>
          Export CSV
        </Button>
      </div>

      <p className="text-2xs text-subtle">
        {loading ? "Loading…" : `${visible.length} calls${visible.length !== calls.length ? ` (filtered from ${calls.length})` : ""}`}
      </p>

      {!loading && visible.length === 0 ? (
        <div className="border border-dashed border-[var(--color-border-strong)] rounded-[8px] p-8 text-center bg-surface">
          <p className="text-sm text-subtle">No calls match these filters.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-[8px] border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 border-b border-[var(--color-border)]">
              <tr className="text-left">
                <Th>When</Th>
                <Th>Firm</Th>
                <Th>Closer</Th>
                <Th>Outcome</Th>
                <Th>Package</Th>
                <Th>Value</Th>
                <Th>Duration</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {visible.map((c) => {
                const isExpanded = expandedId === c.id;
                return (
                  <>
                    <tr key={c.id} className="hover:bg-surface-2">
                      <td className="px-3 py-2 text-xs text-subtle whitespace-nowrap">{formatDate(c.startedAt)}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-heading truncate">{c.firmName}</p>
                        <p className="text-2xs text-subtle">
                          {[c.firmCity, c.firmState].filter(Boolean).join(", ")}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-xs text-body">{c.closerName ?? c.openerName ?? "—"}</td>
                      <td className="px-3 py-2 text-2xs uppercase tracking-wider text-subtle">
                        {c.outcome ? OUTCOME_LABELS[c.outcome] : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-body">{c.packageSold ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-body tabular-nums">{formatCents(c.contractValueCents)}</td>
                      <td className="px-3 py-2 text-xs text-subtle">{formatDuration(c.durationSeconds)}</td>
                      <td className="px-3 py-2 text-right">
                        {(c.notes || c.objectionsHit?.length || c.triggersHit?.length) ? (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="text-2xs uppercase tracking-wider font-semibold text-subtle hover:text-heading"
                          >
                            {isExpanded ? "Hide" : "Detail"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={c.id + ":detail"} className="bg-surface-2">
                        <td colSpan={8} className="px-3 py-3">
                          <div className="flex flex-col gap-2">
                            {c.objectionsHit && c.objectionsHit.length > 0 && (
                              <Detail label="Objections">
                                <span className="text-xs text-body">{c.objectionsHit.join(", ")}</span>
                              </Detail>
                            )}
                            {c.triggersHit && c.triggersHit.length > 0 && (
                              <Detail label="Triggers">
                                <span className="text-xs text-body">{c.triggersHit.join(", ")}</span>
                              </Detail>
                            )}
                            {c.notes && (
                              <Detail label="Notes">
                                <p className="text-xs text-body whitespace-pre-wrap leading-relaxed">{c.notes}</p>
                              </Detail>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-2xs uppercase tracking-wider font-semibold text-subtle">
      {children}
    </th>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs uppercase tracking-wider font-semibold text-subtle mb-0.5">{label}</p>
      {children}
    </div>
  );
}
