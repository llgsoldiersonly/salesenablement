import { useEffect, useMemo, useState } from "react";
import { getLeadQueue, type LeadQueueItem } from "../../lib/leadQueue";
import { assignLead } from "../../lib/assignments";
import { getAllProfiles } from "../../lib/adminStats";
import type { SalesProfile } from "../../lib/auth";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function LeadAssignmentView() {
  const [leads, setLeads] = useState<LeadQueueItem[]>([]);
  const [profiles, setProfiles] = useState<SalesProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"unassigned" | "assigned" | "all">("unassigned");

  const reload = async () => {
    setLoading(true);
    const [page, prof] = await Promise.all([getLeadQueue({ limit: 200 }), getAllProfiles()]);
    setLeads(page.items);
    setProfiles(prof.filter((p) => p.active));
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = leads.filter((l) => {
      if (filter === "unassigned") return !l.assignedToId;
      if (filter === "assigned") return !!l.assignedToId;
      return true;
    });
    if (!q) return filtered;
    return filtered.filter((l) => {
      const f = l.report.firm;
      return [
        f.name, f.city, f.state, f.practiceArea, l.openerName,
        l.contactName, l.assignedToName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [leads, filter, search]);

  const handleAssign = async (assessmentId: string, assigneeId: string) => {
    const value = assigneeId === "" ? null : assigneeId;
    await assignLead(assessmentId, value);
    setLeads((prev) =>
      prev.map((l) =>
        l.assessmentId === assessmentId
          ? {
              ...l,
              assignedToId: value,
              assignedToName: value ? profiles.find((p) => p.id === value)?.full_name ?? profiles.find((p) => p.id === value)?.email ?? null : null,
              assignedAt: value ? new Date().toISOString() : null,
            }
          : l,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads…"
          className="flex-1 min-w-[200px] bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-xs text-body outline-none focus:ring-2 focus:ring-brand placeholder:text-subtle"
        />
        <div className="flex rounded-[8px] border border-[var(--color-border)] overflow-hidden">
          {(["unassigned", "assigned", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                filter === f ? "bg-brand text-white" : "text-subtle hover:text-heading bg-surface",
              ].join(" ")}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-subtle text-center py-10 animate-pulse">Loading leads…</p>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-[var(--color-border-strong)] rounded-[8px] p-8 text-center bg-surface">
          <p className="text-sm text-subtle">No leads match this filter.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-[8px] border border-[var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-surface-2 border-b border-[var(--color-border)]">
              <tr className="text-left">
                <Th>Firm</Th>
                <Th>Status</Th>
                <Th>Opener</Th>
                <Th>Created</Th>
                <Th>Assigned to</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {visible.map((l) => (
                <tr key={l.assessmentId} className="hover:bg-surface-2">
                  <td className="px-3 py-2 align-top">
                    <p className="font-medium text-heading truncate">{l.report.firm.name}</p>
                    <p className="text-2xs text-subtle">
                      {[l.report.firm.city, l.report.firm.state].filter(Boolean).join(", ")}
                    </p>
                  </td>
                  <td className="px-3 py-2 align-top text-2xs uppercase tracking-wider text-subtle">
                    {l.status.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-body">
                    {l.openerName ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-subtle">
                    {timeAgo(l.createdAt)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <select
                      value={l.assignedToId ?? ""}
                      onChange={(e) => void handleAssign(l.assessmentId, e.target.value)}
                      className="w-full bg-surface shadow-inset rounded-[6px] border border-[var(--color-border)] px-2 py-1 text-xs text-body outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="">— Unassigned —</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name ?? p.email}
                          {p.role !== "opener" ? ` (${p.role})` : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-2xs uppercase tracking-wider font-semibold text-subtle">
      {children}
    </th>
  );
}
