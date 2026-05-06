import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { supabase } from "../../lib/supabase";

interface AuditRow {
  id: string;
  action: string;
  created_at: string;
  actor_id: string;
  target_id: string | null;
  target_type: string | null;
  metadata: Record<string, unknown> | null;
  actorName: string | null;
}

interface ActivityRow {
  id: string;
  action: string;
  created_at: string;
  actor_id: string;
  target_id: string | null;
  target_type: string | null;
  metadata: Record<string, unknown> | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

const ACTION_LABELS: Record<string, string> = {
  "assessment.created": "Lead created",
  "call.ended": "Call logged",
  "brief.generated": "Brief generated",
  "lead.assigned": "Lead assigned",
};

const ACTION_ICONS: Record<string, string> = {
  "assessment.created": "🆕",
  "call.ended": "📞",
  "brief.generated": "📄",
  "lead.assigned": "📌",
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

function describe(row: AuditRow): string {
  const meta = row.metadata ?? {};
  if (row.action === "call.ended") {
    const outcome = (meta as { outcome?: string }).outcome;
    const value = (meta as { contract_value_cents?: number }).contract_value_cents;
    const v = value ? ` · $${Math.round(value / 100).toLocaleString()}` : "";
    return outcome ? `${outcome.replace(/_/g, " ")}${v}` : `Call logged${v}`;
  }
  if (row.action === "assessment.created") {
    const firm = (meta as { firm_name?: string }).firm_name;
    return firm ? `Created lead for ${firm}` : "Created lead";
  }
  return ACTION_LABELS[row.action] ?? row.action;
}

export function ActivityAuditView() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");

  const reload = async () => {
    setLoading(true);
    const { data: activityData } = await supabase
      .from("sales_activity")
      .select("id, action, created_at, actor_id, target_id, target_type, metadata")
      .order("created_at", { ascending: false })
      .limit(500);

    const activities = (activityData ?? []) as ActivityRow[];
    const actorIds = Array.from(new Set(activities.map((a) => a.actor_id)));
    const { data: profiles } = actorIds.length
      ? await supabase
          .from("sales_profiles")
          .select("id, full_name, email")
          .in("id", actorIds)
      : { data: [] };

    const byId = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));
    setRows(
      activities.map((a) => {
        const p = byId.get(a.actor_id);
        return {
          ...a,
          actorName: p?.full_name ?? p?.email ?? null,
        };
      }),
    );
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter && r.action !== actionFilter) return false;
      if (!q) return true;
      const haystack = [
        r.action,
        r.actorName,
        JSON.stringify(r.metadata ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, actionFilter]);

  const actionTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.action))).sort(),
    [rows],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search audit log…"
          className="flex-1 min-w-[200px] bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-xs text-body outline-none focus:ring-2 focus:ring-brand placeholder:text-subtle"
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-2 py-1.5 text-xs"
        >
          <option value="">All actions</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
          ))}
        </select>
        <Button variant="neutral" size="sm" onClick={() => void reload()} disabled={loading}>
          {loading ? "…" : "Refresh"}
        </Button>
      </div>

      <p className="text-2xs text-subtle">
        {loading ? "Loading…" : `${visible.length} events${visible.length !== rows.length ? ` (filtered from ${rows.length})` : ""}`}
      </p>

      {!loading && visible.length === 0 ? (
        <div className="border border-dashed border-[var(--color-border-strong)] rounded-[8px] p-8 text-center bg-surface">
          <p className="text-sm text-subtle">No audit events match.</p>
        </div>
      ) : (
        <ul className="bg-surface rounded-[8px] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {visible.map((r) => (
            <li key={r.id} className="px-4 py-2.5 flex gap-3 items-center">
              <span className="text-base shrink-0" aria-hidden>
                {ACTION_ICONS[r.action] ?? "•"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-heading">
                  <span className="font-medium">{r.actorName ?? "Unknown"}</span>
                  {" · "}
                  <span className="text-body">{describe(r)}</span>
                </p>
                <p className="text-2xs text-subtle">{timeAgo(r.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
