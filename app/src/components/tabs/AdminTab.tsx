import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { LeadAssignmentView } from "../admin/LeadAssignmentView";
import { CallsLibraryView } from "../admin/CallsLibraryView";
import { ActivityAuditView } from "../admin/ActivityAuditView";
import {
  getNotesForRep,
  addCoachNote,
  updateCoachNote,
  deleteCoachNote,
  type CoachNote,
} from "../../lib/coachNotes";
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
import {
  inviteTeammate,
  getInvitations,
  revokeInvitation,
  deleteInvitation,
  type Invitation,
} from "../../lib/invitations";

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

function RepCard({ stats, variant }: { stats: EmployeeStats; variant: "opener" | "closer" }) {
  const [expanded, setExpanded] = useState(false);
  const name = stats.profile.full_name ?? stats.profile.email.split("@")[0];
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

  return (
    <div className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-[var(--color-bg-subtle)] transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-[8px] bg-brand/10 text-brand text-xs font-semibold flex items-center justify-center shrink-0">
            {initials || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-heading truncate">{name}</p>
            <p className="text-2xs text-subtle uppercase tracking-wider">{stats.profile.role}</p>
          </div>
          <span className="text-subtle text-xs sm:hidden ml-2">{expanded ? "▲" : "▼"}</span>
        </div>

        {variant === "opener" ? (
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-5 sm:shrink-0">
            <KPI label="Site Audits" value={stats.assessments} />
            <KPI label="Handoffs" value={stats.calls} />
            <KPI label="Revenue" value={formatCents(stats.revenueCents)} color="brand" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-5 sm:shrink-0">
            <KPI label="Calls" value={stats.calls} />
            <KPI label="Won" value={stats.won} color="success" />
            <KPI
              label="Win %"
              value={`${stats.winRate}%`}
              color={stats.calls === 0 ? undefined : stats.winRate >= 40 ? "success" : stats.winRate < 20 ? "danger" : undefined}
            />
            <KPI label="Revenue" value={formatCents(stats.revenueCents)} color="brand" />
          </div>
        )}
        <span className="text-subtle text-xs ml-3 hidden sm:inline">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-bg-subtle)] flex gap-6 flex-wrap">
          {variant === "closer" && (
            <>
              <div>
                <p className="text-2xs text-subtle uppercase tracking-wider mb-1">Avg Call Length</p>
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
                  <p className="text-2xs text-subtle uppercase tracking-wider mb-1">Top Objections</p>
                  <div className="flex gap-1 flex-wrap">
                    {stats.topObjections.map((o) => (
                      <span key={o} className="text-2xs bg-surface border border-[var(--color-border)] rounded px-1.5 py-0.5 text-body">
                        {OBJECTION_LABELS[o] ?? o}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {variant === "opener" && stats.assessments > 0 && (
            <div>
              <p className="text-2xs text-subtle uppercase tracking-wider mb-1">Conversion</p>
              <p className="text-sm font-semibold text-heading">
                {stats.assessments > 0 ? `${Math.round((stats.calls / stats.assessments) * 100)}%` : "—"}
              </p>
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

// ── Coach notes panel ─────────────────────────────────────────────────────────

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CoachNotesPanel({ repId }: { repId: string }) {
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  useEffect(() => {
    void getNotesForRep(repId).then((n) => { setNotes(n); setLoading(false); });
  }, [repId]);

  const handleAdd = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const note = await addCoachNote(repId, draft.trim());
    if (note) setNotes((prev) => [note, ...prev]);
    setDraft("");
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editBody.trim()) return;
    await updateCoachNote(id, editBody.trim());
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, body: editBody.trim() } : n));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteCoachNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Compose */}
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a coaching note…"
          rows={2}
          className="flex-1 text-xs bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-body resize-none outline-none focus:ring-2 focus:ring-brand"
        />
        <button
          onClick={() => void handleAdd()}
          disabled={saving || !draft.trim()}
          className="self-end text-xs px-3 py-2 rounded-[8px] bg-brand text-white font-medium disabled:opacity-40 hover:bg-brand/90 transition-colors"
        >
          {saving ? "…" : "Save"}
        </button>
      </div>

      {/* Existing notes */}
      {loading ? (
        <p className="text-xs text-subtle animate-pulse">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-subtle italic">No coaching notes yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div key={note.id} className="bg-surface border border-[var(--color-border)] rounded-[8px] px-3 py-2">
              {editingId === note.id ? (
                <div className="flex gap-2">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={2}
                    autoFocus
                    className="flex-1 text-xs bg-surface shadow-inset rounded-[6px] border border-[var(--color-border)] px-2 py-1.5 text-body resize-none outline-none focus:ring-2 focus:ring-brand"
                  />
                  <div className="flex flex-col gap-1 self-start">
                    <button onClick={() => void handleUpdate(note.id)} className="text-2xs text-brand font-semibold hover:underline">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-2xs text-subtle hover:underline">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="text-xs text-body leading-relaxed flex-1 whitespace-pre-wrap">{note.body}</p>
                  <div className="flex gap-2 shrink-0 mt-0.5">
                    <button
                      onClick={() => { setEditingId(note.id); setEditBody(note.body); }}
                      className="text-2xs text-subtle hover:text-brand transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void handleDelete(note.id)}
                      className="text-2xs text-subtle hover:text-[var(--color-danger)] transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
              <p className="text-2xs text-subtle mt-1">
                {note.authorName ?? "Admin"} · {timeAgoShort(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [notesOpen, setNotesOpen] = useState(false);
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
        "bg-surface border border-[var(--color-border)] rounded-[8px] overflow-hidden",
        !profile.active ? "opacity-50" : "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3">
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

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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

          <button
            onClick={() => setNotesOpen((v) => !v)}
            className="text-xs text-subtle hover:text-brand transition-colors font-medium px-2 py-1.5"
          >
            {notesOpen ? "Hide Notes" : "Coach Notes"}
          </button>
        </div>
      </div>

      {notesOpen && (
        <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-bg-subtle)]">
          <CoachNotesPanel repId={profile.id} />
        </div>
      )}
    </div>
  );
}

function InvitationsPanel() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SalesRole>("opener");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setInvitations(await getInvitations());
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !email.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await inviteTeammate(email, role);
    setSubmitting(false);
    if (res.ok) {
      setSuccessMsg(`${email.trim()} can now sign in as ${role}.`);
      setEmail("");
      void reload();
    } else {
      setErrorMsg(res.error);
    }
  };

  const handleRevoke = async (id: string) => {
    await revokeInvitation(id);
    void reload();
  };

  const handleDelete = async (id: string) => {
    await deleteInvitation(id);
    void reload();
  };

  const pending = invitations.filter((i) => !i.acceptedAt && !i.revokedAt);
  const inactive = invitations.filter((i) => i.acceptedAt || i.revokedAt);

  return (
    <section className="bg-surface border border-[var(--color-border)] rounded-[8px] p-4 flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-heading mb-1">
          Invite Teammate
        </h2>
        <p className="text-xs text-subtle">
          Add an email below before sharing the app URL. Anyone NOT on this list will be rejected at sign-in.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@firm.com"
          required
          disabled={submitting}
          className="flex-1 min-w-[220px] bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-xs text-body outline-none focus:ring-2 focus:ring-brand placeholder:text-subtle"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as SalesRole)}
          disabled={submitting}
          className="bg-surface border border-[var(--color-border)] rounded-[8px] px-2 py-1.5 text-xs text-body outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="opener">Opener</option>
          <option value="closer">Closer</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="px-3 py-1.5 rounded-[8px] bg-brand text-white text-xs font-semibold disabled:opacity-40 hover:brightness-110 transition-all"
        >
          {submitting ? "Sending…" : "Send invite"}
        </button>
      </form>

      {errorMsg && (
        <p className="text-2xs text-[var(--color-danger)]">{errorMsg}</p>
      )}
      {successMsg && (
        <p className="text-2xs text-[var(--color-success)]">{successMsg}</p>
      )}

      {!loading && pending.length > 0 && (
        <div>
          <p className="text-2xs uppercase tracking-wider font-semibold text-subtle mb-2">
            Pending ({pending.length})
          </p>
          <div className="flex flex-col gap-1">
            {pending.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-2 px-3 py-2 rounded-[8px] border border-[var(--color-border)] bg-surface text-xs"
              >
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-heading truncate">{inv.email}</span>
                  <span className="ml-2 text-2xs uppercase tracking-wider text-subtle">{inv.role}</span>
                </span>
                <span className="text-2xs text-subtle">{timeAgo(inv.invitedAt)}</span>
                <button
                  onClick={() => handleRevoke(inv.id)}
                  className="text-2xs text-[var(--color-danger)] hover:underline font-medium"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && inactive.length > 0 && (
        <details className="text-xs text-subtle">
          <summary className="cursor-pointer text-2xs uppercase tracking-wider font-semibold">
            History ({inactive.length})
          </summary>
          <div className="flex flex-col gap-1 mt-2">
            {inactive.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-[var(--color-border)] bg-surface-2 opacity-70"
              >
                <span className="flex-1 truncate">
                  <span className="text-body">{inv.email}</span>
                  <span className="ml-2 text-2xs uppercase tracking-wider">
                    {inv.acceptedAt ? "accepted" : "revoked"}
                  </span>
                </span>
                <button
                  onClick={() => handleDelete(inv.id)}
                  className="text-2xs text-subtle hover:text-[var(--color-danger)] hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
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
      <InvitationsPanel />

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
  const [view, setView] = useState<"performance" | "team" | "leads" | "calls" | "audit">("performance");
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

  const openers = stats.filter((s) => s.profile.role === "opener");
  const closers = stats.filter((s) => s.profile.role !== "opener");

  const insights = buildInsights(stats);
  const totalAssessments = openers.reduce((s, e) => s + e.assessments, 0);
  const totalHandoffs = openers.reduce((s, e) => s + e.calls, 0);
  const totalCalls = closers.reduce((s, e) => s + e.calls, 0);
  const totalWon = closers.reduce((s, e) => s + e.won, 0);
  const teamWinRate = totalCalls > 0 ? Math.round((totalWon / totalCalls) * 100) : 0;
  const totalRevenue = stats.reduce((s, e) => s + e.revenueCents, 0);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-heading">Team Dashboard</h1>
          <p className="text-xs sm:text-sm text-subtle mt-0.5">Admin view · performance by rep</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto md:overflow-visible scrollbar-thin">
          {/* View toggle */}
          <div className="flex rounded-[8px] border border-[var(--color-border)] overflow-hidden shrink-0">
            {(["performance", "team", "leads", "calls", "audit"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={[
                  "px-2.5 sm:px-3 py-1.5 text-2xs sm:text-xs font-medium transition-colors whitespace-nowrap",
                  view === v
                    ? "bg-brand text-white"
                    : "text-subtle hover:text-heading bg-surface",
                ].join(" ")}
              >
                {v === "performance" ? "Performance"
                  : v === "team" ? "Team"
                  : v === "leads" ? "Leads"
                  : v === "calls" ? "Calls"
                  : "Audit"}
              </button>
            ))}
          </div>

          {/* Period toggle — only visible on performance view */}
          {view === "performance" && (
            <div className="flex rounded-[8px] border border-[var(--color-border)] overflow-hidden shrink-0">
              {(["week", "month"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={[
                    "px-2.5 sm:px-4 py-1.5 text-2xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                    period === p
                      ? "bg-brand text-white"
                      : "text-subtle hover:text-heading bg-surface",
                  ].join(" ")}
                >
                  {p === "week" ? "Week" : "Month"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === "team" ? (
        <TeamView currentUserId={currentUserId} />
      ) : view === "leads" ? (
        <LeadAssignmentView />
      ) : view === "calls" ? (
        <CallsLibraryView />
      ) : view === "audit" ? (
        <ActivityAuditView />
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <p className="text-sm text-subtle animate-pulse">Loading team data…</p>
        </div>
      ) : (
        <>
          {/* Team totals — split by role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opener KPIs */}
            <div className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm p-4">
              <p className="text-2xs uppercase tracking-widest font-semibold text-subtle mb-3">
                Openers · {openers.length} reps
              </p>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums text-heading">{totalAssessments}</p>
                  <p className="text-2xs text-subtle uppercase tracking-wider mt-0.5">Site Audits</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums text-heading">{totalHandoffs}</p>
                  <p className="text-2xs text-subtle uppercase tracking-wider mt-0.5">Handoffs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums text-brand">{formatCents(openers.reduce((s, e) => s + e.revenueCents, 0))}</p>
                  <p className="text-2xs text-subtle uppercase tracking-wider mt-0.5">Revenue</p>
                </div>
              </div>
            </div>
            {/* Closer KPIs */}
            <div className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm p-4">
              <p className="text-2xs uppercase tracking-widest font-semibold text-subtle mb-3">
                Closers · {closers.length} reps
              </p>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums text-heading">{totalCalls}</p>
                  <p className="text-2xs text-subtle uppercase tracking-wider mt-0.5">Calls</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums text-[var(--color-success)]">{totalWon}</p>
                  <p className="text-2xs text-subtle uppercase tracking-wider mt-0.5">Won</p>
                </div>
                <div className="text-center">
                  <p className={["text-2xl font-semibold tabular-nums", totalCalls === 0 ? "text-heading" : teamWinRate >= 30 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"].join(" ")}>
                    {teamWinRate}%
                  </p>
                  <p className="text-2xs text-subtle uppercase tracking-wider mt-0.5">Win Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums text-brand">{formatCents(totalRevenue)}</p>
                  <p className="text-2xs text-subtle uppercase tracking-wider mt-0.5">Revenue</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coaching insights */}
          {insights.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-heading mb-3">
                Coaching Insights
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

          {/* Openers section */}
          {openers.length > 0 && (
            <section>
              <div className="mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-heading">Openers</h2>
                <p className="text-2xs text-subtle mt-0.5">Site audits run · leads handed off to closers</p>
              </div>
              <div className="flex flex-col gap-2">
                {openers.map((s) => <RepCard key={s.profile.id} stats={s} variant="opener" />)}
              </div>
            </section>
          )}

          {/* Closers section */}
          {closers.length > 0 && (
            <section>
              <div className="mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-heading">Closers</h2>
                <p className="text-2xs text-subtle mt-0.5">Calls taken · deals closed · revenue generated</p>
              </div>
              <div className="flex flex-col gap-2">
                {closers.map((s) => <RepCard key={s.profile.id} stats={s} variant="closer" />)}
              </div>
            </section>
          )}

          {stats.length === 0 && (
            <p className="text-sm text-subtle">No team members found.</p>
          )}

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
