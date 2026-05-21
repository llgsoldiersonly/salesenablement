import { useEffect, useState } from "react";
import {
  LEAD_STATUS_LABEL,
  type LeadStatus,
  type LeadStatusHistoryRow,
  type LeadWithAssessment,
  getLeadStatusHistory,
} from "../../lib/leads";
import { StatusDropdown } from "./StatusBadge";
import { formatCents, leadDisplayName, leadLocation, relativeDays } from "./leadFormatters";

interface Props {
  lead: LeadWithAssessment;
  onClose: () => void;
  onStatusChange: (next: LeadStatus) => void;
  onTogglePin: (nextPinned: boolean) => void;
}

export function LeadDetailDrawer({ lead, onClose, onStatusChange, onTogglePin }: Props) {
  const [history, setHistory] = useState<LeadStatusHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    void getLeadStatusHistory(lead.id).then((rows) => {
      if (cancelled) return;
      setHistory(rows);
      setLoadingHistory(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lead.id]);

  // Close on ESC
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={`Lead details for ${leadDisplayName(lead)}`}
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] bg-surface shadow-2xl overflow-y-auto scrollbar-thin border-l border-[var(--color-border)]"
      >
        {/* Header */}
        <header className="sticky top-0 bg-surface px-5 pt-4 pb-3 border-b border-[var(--color-border)] z-10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTogglePin(!lead.pinned)}
                className={`text-base leading-none ${lead.pinned ? "text-brand" : "text-subtle hover:text-brand"}`}
                aria-label={lead.pinned ? "unpin" : "pin"}
              >
                {lead.pinned ? "★" : "☆"}
              </button>
              <h2 className="text-base font-semibold text-heading truncate">
                {leadDisplayName(lead)}
              </h2>
            </div>
            <p className="text-2xs text-subtle mt-0.5">
              {[leadLocation(lead), lead.firm_practice_area].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="close"
            className="w-8 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md flex items-center justify-center text-subtle"
          >
            ✕
          </button>
        </header>

        {/* Status control */}
        <section className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
          <span className="text-2xs uppercase tracking-wider text-subtle">Status</span>
          <StatusDropdown value={lead.status} onChange={onStatusChange} />
        </section>

        {/* Sales context */}
        <Section title="Sales context">
          <DefList>
            <Row label="Website">
              {lead.firm_url ? (
                <a
                  href={lead.firm_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline truncate"
                >
                  {lead.firm_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              ) : "—"}
            </Row>
            <Row label="Coverage">
              {lead.coverage_score != null ? `${lead.coverage_score}%` : "—"}
            </Row>
            <Row label="Recommended package">{lead.quoted_package ?? "—"}</Row>
            <Row label="Quoted value">{formatCents(lead.quoted_value_cents)}</Row>
            <Row label="Win confidence">
              {lead.win_confidence ? `${lead.win_confidence}/5` : "—"}
            </Row>
          </DefList>
        </Section>

        {/* Contact */}
        <Section title="Contact">
          <DefList>
            <Row label="Contact">{lead.contact_name ?? "—"}</Row>
            <Row label="Title">{lead.contact_role ?? "—"}</Row>
            <Row label="Email">{lead.contact_email ?? "—"}</Row>
            <Row label="Phone">{lead.contact_phone ?? "—"}</Row>
            <Row label="Decision-maker">
              {lead.decision_maker_name ?? "—"}
              {lead.decision_maker_confirmed && (
                <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--color-success)]">
                  ✓ confirmed
                </span>
              )}
            </Row>
            <Row label="DM title">{lead.decision_maker_title ?? "—"}</Row>
            <Row label="Best time">{lead.best_time_to_call ?? "—"}</Row>
            <Row label="Address">{lead.contact_address ?? "—"}</Row>
          </DefList>
        </Section>

        {/* Gatekeeper notes — only show if populated to keep the drawer compact */}
        {lead.gatekeeper_notes && (
          <Section title="Gatekeeper notes">
            <p className="text-sm text-body whitespace-pre-wrap">{lead.gatekeeper_notes}</p>
          </Section>
        )}

        {/* Outcome */}
        {(lead.status === "signed" || lead.status === "lost_lead") && (
          <Section title={lead.status === "signed" ? "Signed deal" : "Lost reason"}>
            <DefList>
              {lead.status === "signed" && (
                <>
                  <Row label="Date">{lead.signed_at ?? "—"}</Row>
                  <Row label="Package">{lead.signed_package ?? "—"}</Row>
                  <Row label="Value">{formatCents(lead.signed_value_cents)}</Row>
                </>
              )}
              {lead.status === "lost_lead" && (
                <>
                  <Row label="Reason">{lead.lost_reason ?? "—"}</Row>
                  <Row label="Lost at">
                    {lead.lost_at ? new Date(lead.lost_at).toLocaleDateString() : "—"}
                  </Row>
                </>
              )}
            </DefList>
          </Section>
        )}

        {/* Status history */}
        <Section title="Status history">
          {loadingHistory ? (
            <p className="text-sm text-subtle">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-subtle italic">
              No status changes yet. Lead is still {LEAD_STATUS_LABEL[lead.status]}.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {history.map((h) => (
                <li key={h.id} className="flex items-start gap-2 text-sm">
                  <span className="text-2xs text-subtle whitespace-nowrap pt-0.5">
                    {relativeDays(h.changed_at)} ago
                  </span>
                  <span className="text-body">
                    {h.from_status ? LEAD_STATUS_LABEL[h.from_status] : "—"} →{" "}
                    <strong className="text-heading">{LEAD_STATUS_LABEL[h.to_status]}</strong>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {/* Tags */}
        {lead.tags.length > 0 && (
          <Section title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {lead.tags.map((t) => (
                <span
                  key={t}
                  className="text-2xs px-2 py-0.5 rounded-full bg-[var(--color-border)] text-body"
                >
                  {t}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Link to assessment */}
        <Section title="Linked assessment">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              localStorage.setItem("llg.activeAssessment.v2", lead.assessment_id);
              window.location.href = "/";
            }}
            className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
          >
            Open full assessment →
          </a>
        </Section>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-4 border-b border-[var(--color-border)] last:border-b-0">
      <h3 className="text-2xs uppercase tracking-wider text-subtle font-semibold mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DefList({ children }: { children: React.ReactNode }) {
  return <dl className="flex flex-col gap-1.5">{children}</dl>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2 text-sm">
      <dt className="text-2xs uppercase tracking-wider text-subtle">{label}</dt>
      <dd className="text-body break-words">{children}</dd>
    </div>
  );
}
