import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import {
  getTeamStats,
  getRecentActivity,
  getAllProfiles,
  updateProfileRole,
  setProfileActive,
  type EmployeeStats,
  type ActivityItem,
  type Period,
  type SalesRole,
} from "../../lib/adminStats";
import type { SalesProfile } from "../../lib/auth";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  if (cents === 0) return "$0";
  if (cents >= 100_000_000) return `$${(cents / 100_000_000).toFixed(1)}M`;
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(1)}k`;
  return `$${(cents / 100).toFixed(0)}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const OBJECTION_LABELS: Record<string, string> = {
  "referrals-only":      "Referrals Only",
  "tried-marketing":     "Tried Before",
  "too-expensive":       "Too Expensive",
  "send-email":          "Send Email",
  "have-marketing-person": "Has Marketer",
  "competitor-pitched":  "Competitor",
  "long-contract":       "Long Contract",
  "need-think-about-it": "Think About It",
};

function formatAction(action: string, meta: Record<string, unknown>): string {
  if (action === "assessment.created")
    return `ran an assessment for ${(meta.firm_name as string) ?? "a firm"}`;
  if (action === "call.ended") {
    const labels: Record<string, string> = {
      closed_won:          "closed a deal",
      closed_lost:         "logged a lost call",
      follow_up_scheduled: "scheduled a follow-up",
      callback_requested:  "logged a callback request",
      no_decision:         "logged no decision",
      not_interested:      "logged not interested",
    };
    return labels[(meta.outcome as string) ?? ""] ?? "ended a call";
  }
  return action;
}

// ── Coaching insights ─────────────────────────────────────────────────────────

interface Insight {
  type: "positive" | "warning" | "info";
  text: string;
}

function buildInsights(stats: EmployeeStats[]): Insight[] {
  const insights: Insight[] = [];
  const totalCalls = stats.reduce((s, e) => s + e.calls, 0);
  if (totalCalls === 0) return insights;

  const teamWinRate = Math.round(
    (stats.reduce((s, e) => s + e.won, 0) / totalCalls) * 100,
  );

  stats.forEach((emp) => {
    const name = emp.profile.full_name ?? emp.profile.email.split("@")[0];

    if (emp.calls >= 3 && emp.winRate >= teamWinRate + 15) {
      insights.push({
        type: "positive",
        text: `${name} is closing at ${emp.winRate}% — ${emp.winRate - teamWinRate}pts above team avg (${teamWinRate}%).`,
      });
    }
    if (emp.calls >= 3 && emp.winRate <= teamWinRate - 15) {
      insights.push({
        type: "warning",
        text: `${name} is at ${emp.winRate}% close rate — ${teamWinRate - emp.winRate}pts below team avg. Consider objection coaching.`,
      });
    }
    if (emp.assessments >= 5 && emp.calls === 0) {
      insights.push({
        type: "warning",
        text: `${name} has run ${emp.assessments} assessments with no logged calls. Are leads converting?`,
      });
    }
    if (emp.topObjections.length >= 2) {
      const labs = emp.topObjections.map((o) => OBJECTION_LABELS[o] ?? o).join(", ");
      insights.push({
        type: "info",
        text: `${name} most frequently hits: ${labs}. Review counter scripts together.`,
      });
    }
    if (emp.won > 0 && emp.revenueCents > 0) {
      const avg = Math.round(emp.revenueCents / emp.won / 100);
      insights.push({
        type: "info",
        text: `${name} averages $${avg.toLocaleString()} per closed deal.`,
      });
    }
  });

  return insights.slice(0, 6);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPI({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: "success" | "danger" | "brand";
}) {
  const cls =
    color === "success"
      ? "text-[var(--color-success)]"
      : color === "danger"
        ? "text-[var(--color-danger)]"
        : color === "brand"
          ? "text-brand"
          : "text-heading";
  return (
    <div className="text-center">
      <p className={`text-sm font-semibold tabular-nums ${cls}`}>{value}</p>
      <p className="text-2xs text-subtle uppercase tracking-wider leading-none mt-0.5">
        {label}
      </p>
    </div>
  );
}

function EmployeeCard({ stats }: { stats: EmployeeStats }) {
  const [expanded, setExpanded] = useState(false);
  const name =
    stats.profile.full_name ?? stats.profile.email.split("@")[0];
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-bg-subtle)] transition-colors"
      >
        <div className="w-8 h-8 rounded-[8px] bg-brand/10 text-brand text-xs font-semibold flex items-center justify-center shrink-0">
          {initials || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-heading truncate">{name}</p>
          <p className="text-2xs text-subtle uppercase tracking-wider">
            {stats.profile.role}
          </p>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <KPI label="Assessments" value={stats.assessments} />
          <KPI label="Calls" value={stats.calls} />
          <KPI label="Won" value={stats.won} color="success" />
          <KPI
            label="Win Rate"
            value={`${stats.winRate}%`}
            color={
              stats.calls === 0
                ? undefined
                : stats.winRate >= 40
                  ? "success"
                  : stats.winRate < 20
                    ? "danger"
                    : undefined
            }
          />
          <KPI label="Revenue" value={formatCents(stats.revenueCents)} color="brand" />
        </div>
        <span className="text-subtle text-xs ml-3">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-bg-subtle)] flex gap-6 flex-wrap">
          <div>
            <p className="text-2xs text-subtle uppercase tracking-wider mb-1">
              Avg Call Length
            </p>
            <p className="text-sm font-semibold text-heading">
              {stats.avgCallMinutes > 0 ? `${stats.avgCallMinutes}m` : "—"}
            </p>
          </div>
          <div>
            <p className="text-2xs text-subtle uppercase tracking-wider mb-1">Deals Lost</p>
            <p className="text-sm font-semibold text-heading">{stats.lost}</p>
          </div>
          {stats.topObjections.length > 0 && (
            <div>
              <p className="text-2xs text-subtle uppercase tracking-wider mb-1">
                Top Objections
              </p>
              <div className="flex gap-1 flex-wrap">
                {stats.topObjections.map((o) => (
                  <span
                    key={o}
                    className="text-2xs bg-surface border border-[var(--color-border)] rounded px-1.5 py-0.5 text-body"
                  >
                    {OBJECTION_LABELS[o] ?? o}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-2xs text-subtle uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm text-body">{stats.profile.email}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Team management ───────────────────────────────────────────────────────────

const ROLE_LABELS: Record<SalesRole, string> = {
  opener: "Opener",
  closer: "Closer",
  admin: "Admin",
};

function TeamMemberRow({
  profile,
  currentUserId,
  onRoleChange,
  onActiveToggle,
}: {
  profile: SalesProfile;
  currentUserId: string;
  onRoleChange: (id: string, role: SalesRole) => Promise<void>;
  onActiveToggle: (id: string, active: boolean) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const name = profile.full_name ?? profile.email.split("@")[0];
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  const isSelf = profile.id === currentUserId;

  const handleRole = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSaving(true);
    await onRoleChange(profile.id, e.target.value as SalesRole);
    setSaving(false);
  };

  const handleToggle = async () => {
    setSaving(true);
    await onActiveToggle(profile.id, !profile.active);
    setSaving(false);
  };

  return (
    <div
      className={[
        "flex items-center gap-3 px-4 py-3 bg-surface border border-[var(--color-border)] rounded-[8px]",
        !profile.active ? "opacity-50" : "",
      ].join(" ")}
    >
      <div className="w-8 h-8 rounded-[8px] bg-brand/10 text-brand text-xs font-semibold flex items-center justify-center shrink-0">
        {initials || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-heading truncate">
          {name}
          {isSelf && (
            <span className="ml-2 text-2xs text-subtle font-normal">(you)</span>
          )}
        </p>
        <p className="text-xs text-subtle truncate">{profile.email}</p>
      </div>

      <select
        value={profile.role}
        onChange={handleRole}
        disabled={saving || isSelf}
        className="text-xs bg-surface border border-[var(--color-border)] rounded-[8px] px-2 py-1.5 text-body outline-none focus:ring-1 focus:ring-brand disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {(["opener", "closer", "admin"] as SalesRole[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>

      <button
        onClick={handleToggle}
        disabled={saving || isSelf}
        className={[
          "text-xs px-3 py-1.5 rounded-[8px] border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
          profile.active
            ? "border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5"
            : "border-[var(--color-success)]/40 text-[var(--color-success)] hover:bg-[var(--color-success)]/5",
        ].join(" ")}
      >
        {saving ? "…" : profile.active ? "Deactivate" : "Reactivate"}
      </button>
    </div>
  );
}

function TeamView({ currentUserId }: { currentUserId: string }) {
  const [profiles, setProfiles] = useState<SalesProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setProfiles(await getAllProfiles());
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const handleRoleChange = async (id: string, role: SalesRole) => {
    await updateProfileRole(id, role);
    setProfiles((prev) => prev.map((p) => p.id === id ? { ...p, role } : p));
  };

  const handleActiveToggle = async (id: string, active: boolean) => {
    await setProfileActive(id, active);
    setProfiles((prev) => prev.map((p) => p.id === id ? { ...p, active } : p));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-subtle animate-pulse">Loading team…</p>
      </div>
    );
  }

  const active = profiles.filter((p) => p.active);
  const inactive = profiles.filter((p) => !p.active);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-heading mb-3">
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-subtle">No active team members.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((p) => (
              <TeamMemberRow
                key={p.id}
                profile={p}
                currentUserId={currentUserId}
                onRoleChange={handleRoleChange}
                onActiveToggle={handleActiveToggle}
              />
            ))}
          </div>
        )}
      </section>

      {inactive.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-heading mb-3">
            Deactivated ({inactive.length})
          </h2>
          <div className="flex flex-col gap-2">
            {inactive.map((p) => (
              <TeamMemberRow
                key={p.id}
                profile={p}
                currentUserId={currentUserId}
                onRoleChange={handleRoleChange}
                onActiveToggle={handleActiveToggle}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminTab() {
  const [view, setView] = useState<"performance" | "team">("performance");
  const [period, setPeriod] = useState<Period>("week");
  const [stats, setStats] = useState<EmployeeStats[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (view !== "performance") return;
    setLoading(true);
    Promise.all([getTeamStats(period), getRecentActivity(30)]).then(([s, a]) => {
      setStats(s);
      setActivity(a);
      setLoading(false);
    });
  }, [period, view]);

  const insights = buildInsights(stats);
  const totalAssessments = stats.reduce((s, e) => s + e.assessments, 0);
  const totalCalls = stats.reduce((s, e) => s + e.calls, 0);
  const totalWon = stats.reduce((s, e) => s + e.won, 0);
  const teamWinRate =
    totalCalls > 0 ? Math.round((totalWon / totalCalls) * 100) : 0;
  const totalRevenue = stats.reduce((s, e) => s + e.revenueCents, 0);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-heading">Team Dashboard</h1>
          <p className="text-sm text-subtle mt-0.5">Admin view · performance by rep</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-[8px] border border-[var(--color-border)] overflow-hidden">
            {(["performance", "team"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={[
                  "px-4 py-1.5 text-sm font-medium transition-colors",
                  view === v
                    ? "bg-brand text-white"
                    : "text-subtle hover:text-heading bg-surface",
                ].join(" ")}
              >
                {v === "performance" ? "Performance" : "Manage Team"}
              </button>
            ))}
          </div>

          {/* Period toggle — only visible on performance view */}
          {view === "performance" && (
            <div className="flex rounded-[8px] border border-[var(--color-border)] overflow-hidden">
              {(["week", "month"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={[
                    "px-4 py-1.5 text-sm font-medium transition-colors",
                    period === p
                      ? "bg-brand text-white"
                      : "text-subtle hover:text-heading bg-surface",
                  ].join(" ")}
                >
                  {p === "week" ? "This Week" : "This Month"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === "team" ? (
        <TeamView currentUserId={currentUserId} />
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <p className="text-sm text-subtle animate-pulse">Loading team data…</p>
        </div>
      ) : (
        <>
          {/* Team totals */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "Assessments", value: totalAssessments },
              { label: "Total Calls", value: totalCalls },
              { label: "Closed Won", value: totalWon, color: "success" as const },
              {
                label: "Team Win Rate",
                value: `${teamWinRate}%`,
                color:
                  totalCalls === 0
                    ? undefined
                    : teamWinRate >= 30
                      ? ("success" as const)
                      : ("danger" as const),
              },
              {
                label: "Total Revenue",
                value: formatCents(totalRevenue),
                color: "brand" as const,
              },
            ].map((tile) => (
              <div
                key={tile.label}
                className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm px-4 py-4 text-center"
              >
                <p
                  className={[
                    "text-2xl font-semibold tabular-nums",
                    tile.color === "success"
                      ? "text-[var(--color-success)]"
                      : tile.color === "danger"
                        ? "text-[var(--color-danger)]"
                        : tile.color === "brand"
                          ? "text-brand"
                          : "text-heading",
                  ].join(" ")}
                >
                  {tile.value}
                </p>
                <p className="text-2xs text-subtle uppercase tracking-wider mt-1">
                  {tile.label}
                </p>
              </div>
            ))}
          </div>

          {/* Coaching insights */}
          {insights.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-heading mb-3">
                Coaching Insights
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {insights.map((ins, i) => (
                  <div
                    key={i}
                    className={[
                      "rounded-[8px] border px-3 py-2 text-xs leading-relaxed",
                      ins.type === "positive"
                        ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-heading"
                        : ins.type === "warning"
                          ? "bg-[#FEF2F2] border-[var(--color-danger)]/30 text-heading"
                          : "bg-surface border-[var(--color-border)] text-body",
                    ].join(" ")}
                  >
                    {ins.type === "positive" ? "✓ " : ins.type === "warning" ? "⚠ " : "→ "}
                    {ins.text}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Employee list */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-heading mb-3">
              Team Members
            </h2>
            {stats.length === 0 ? (
              <p className="text-sm text-subtle">No team members found.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.map((s) => (
                  <EmployeeCard key={s.profile.id} stats={s} />
                ))}
              </div>
            )}
          </section>

          {/* Activity feed */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-heading mb-3">
              Recent Activity
            </h2>
            {activity.length === 0 ? (
              <p className="text-sm text-subtle">No activity yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-[var(--color-border)] rounded-[8px] border border-[var(--color-border)] overflow-hidden">
                {activity.map((a) => {
                  const valueStr =
                    a.action === "call.ended" &&
                    (a.metadata.contract_value_cents as number) > 0
                      ? ` — ${formatCents(a.metadata.contract_value_cents as number)}`
                      : "";
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 px-4 py-2.5 bg-surface hover:bg-[var(--color-bg-subtle)] transition-colors"
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            a.action === "call.ended" &&
                            (a.metadata.outcome as string) === "closed_won"
                              ? "var(--color-success)"
                              : a.action === "call.ended"
                                ? "var(--color-brand, #E8856A)"
                                : "var(--color-border-strong)",
                        }}
                      />
                      <p className="text-xs text-body flex-1">
                        <span className="font-semibold text-heading">{a.actorName}</span>{" "}
                        {formatAction(a.action, a.metadata)}
                        {valueStr}
                      </p>
                      <p className="text-2xs text-subtle shrink-0">{timeAgo(a.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
