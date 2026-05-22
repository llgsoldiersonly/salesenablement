import { useEffect, useState } from "react"; // useState used by FlipReadySection below
import {
  LEAD_STATUS_LABEL,
  type Lead,
  type LeadStatus,
  type LeadStatusHistoryRow,
  type LeadWithAssessment,
  type AssessmentContactPatch,
  getLeadStatusHistory,
} from "../../lib/leads";
import { StatusDropdown } from "./StatusBadge";
import {
  EditableRow,
  EditableTextareaRow,
  EditableCheckboxRow,
} from "./EditableField";
import { CallButton } from "./CallButton";
import { formatCents, leadDisplayName, leadLocation, relativeDays } from "./leadFormatters";

interface Props {
  lead: LeadWithAssessment;
  onClose: () => void;
  onStatusChange: (next: LeadStatus) => void;
  onTogglePin: (nextPinned: boolean) => void;
  /** Persist a patch to the lead row. Returns true on success. */
  onPatchLead: (patch: Partial<Lead>) => Promise<boolean>;
  /** Persist a patch to the underlying assessment's contact fields. */
  onPatchAssessmentContact: (patch: AssessmentContactPatch) => Promise<boolean>;
  /** Toggle the persistent "ready for closer" flag. */
  onToggleReadyForCloser: (next: boolean) => Promise<boolean>;
}

export function LeadDetailDrawer({
  lead,
  onClose,
  onStatusChange,
  onTogglePin,
  onPatchLead,
  onPatchAssessmentContact,
  onToggleReadyForCloser,
}: Props) {
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
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] bg-neutral-primary-soft shadow-2xl overflow-y-auto scrollbar-thin border-l border-[var(--color-border-default)]"
      >
        {/* Header */}
        <header className="sticky top-0 bg-neutral-primary-soft px-5 pt-4 pb-3 border-b border-[var(--color-border-default)] z-10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTogglePin(!lead.pinned)}
                className={`text-base leading-none ${lead.pinned ? "text-brand" : "text-body-subtle hover:text-brand"}`}
                aria-label={lead.pinned ? "unpin" : "pin"}
              >
                {lead.pinned ? "★" : "☆"}
              </button>
              <h2 className="text-base font-semibold text-heading truncate">
                {leadDisplayName(lead)}
              </h2>
            </div>
            <p className="text-2xs text-body-subtle mt-0.5">
              {[leadLocation(lead), lead.firm_practice_area].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="close"
            className="w-8 h-8 rounded-[8px] bg-neutral-secondary-medium hover:bg-neutral-tertiary-medium flex items-center justify-center text-body-subtle hover:text-heading transition-colors"
          >
            ✕
          </button>
        </header>

        {/* Status control */}
        <section className="px-5 py-4 border-b border-[var(--color-border-default)] flex items-center justify-between gap-3">
          <span className="text-2xs uppercase tracking-wider text-body-subtle">Status</span>
          <StatusDropdown value={lead.status} onChange={onStatusChange} />
        </section>

        {/* Flip Ready toggle */}
        <FlipReadySection
          ready={lead.ready_for_closer}
          readyAt={lead.ready_for_closer_at}
          onToggle={onToggleReadyForCloser}
          disabled={lead.status === "lost_lead" || lead.status === "signed"}
        />

        {/* Sales context */}
        <Section title="Sales context">
          <DefList>
            <Row label="Website">
              {lead.firm_url ? (
                <a
                  href={lead.firm_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg-brand hover:underline truncate"
                >
                  {lead.firm_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              ) : "—"}
            </Row>
            <Row label="Coverage">
              {lead.coverage_score != null ? `${lead.coverage_score}%` : "—"}
            </Row>
            <EditableRow
              label="Recommended pkg"
              value={lead.quoted_package}
              onSave={(next) => onPatchLead({ quoted_package: next })}
              placeholder="Not quoted yet"
            />
            <Row label="Quoted value">{formatCents(lead.quoted_value_cents)}</Row>
            <Row label="Win confidence">
              {lead.win_confidence ? `${lead.win_confidence}/5` : "—"}
            </Row>
          </DefList>
        </Section>

        {/* Contact — editable */}
        <Section title="Contact">
          <DefList>
            <EditableRow
              label="Contact"
              value={lead.contact_name}
              onSave={(next) => onPatchAssessmentContact({ contact_name: next })}
              placeholder="Not captured"
            />
            <EditableRow
              label="Title"
              value={lead.contact_role}
              onSave={(next) => onPatchAssessmentContact({ contact_role: next })}
              placeholder="Not captured"
            />
            <EditableRow
              label="Email"
              value={lead.contact_email}
              type="email"
              onSave={(next) => onPatchAssessmentContact({ contact_email: next })}
              placeholder="Not captured"
            />
            <EditableRow
              label="Phone"
              value={lead.contact_phone}
              type="tel"
              onSave={(next) => onPatchAssessmentContact({ contact_phone: next })}
              placeholder="Not captured"
              rightAddon={<CallButton phone={lead.contact_phone} leadId={lead.id} />}
            />
            <EditableRow
              label="Decision-maker"
              value={lead.decision_maker_name}
              onSave={(next) => onPatchLead({ decision_maker_name: next })}
              placeholder="Not identified"
            />
            <EditableRow
              label="DM title"
              value={lead.decision_maker_title}
              onSave={(next) => onPatchLead({ decision_maker_title: next })}
              placeholder="—"
            />
            <EditableCheckboxRow
              label="DM confirmed"
              value={lead.decision_maker_confirmed}
              onSave={(next) => onPatchLead({ decision_maker_confirmed: next })}
              trueLabel="✓ Confirmed"
              falseLabel="Not yet"
            />
            <EditableRow
              label="Best time"
              value={lead.best_time_to_call}
              onSave={(next) => onPatchLead({ best_time_to_call: next })}
              placeholder="—"
            />
            <EditableRow
              label="Address"
              value={lead.contact_address}
              onSave={(next) => onPatchLead({ contact_address: next })}
              placeholder="—"
            />
          </DefList>
        </Section>

        {/* Gatekeeper notes — always shown, editable */}
        <Section title="Gatekeeper notes">
          <EditableTextareaRow
            label=""
            value={lead.gatekeeper_notes}
            onSave={(next) => onPatchLead({ gatekeeper_notes: next })}
            placeholder="Who screens calls? Best time to reach DM? Tone? Click to add."
            rows={4}
          />
        </Section>

        {/* Outcome (only when terminal status) */}
        {(lead.status === "signed" || lead.status === "lost_lead") && (
          <Section title={lead.status === "signed" ? "Signed deal" : "Lost reason"}>
            <DefList>
              {lead.status === "signed" && (
                <>
                  <Row label="Date">{lead.signed_at ?? "—"}</Row>
                  <EditableRow
                    label="Package"
                    value={lead.signed_package}
                    onSave={(next) => onPatchLead({ signed_package: next })}
                    placeholder="—"
                  />
                  <Row label="Value">{formatCents(lead.signed_value_cents)}</Row>
                </>
              )}
              {lead.status === "lost_lead" && (
                <>
                  <EditableRow
                    label="Reason"
                    value={lead.lost_reason}
                    onSave={(next) => onPatchLead({ lost_reason: next })}
                    placeholder="Why was this lost?"
                  />
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
            <p className="text-sm text-body-subtle">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-body-subtle italic">
              No status changes yet. Lead is still {LEAD_STATUS_LABEL[lead.status]}.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {history.map((h) => (
                <li key={h.id} className="flex items-start gap-2 text-sm">
                  <span className="text-2xs text-body-subtle whitespace-nowrap pt-0.5">
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
                  className="text-2xs px-2 py-0.5 rounded-full bg-neutral-secondary-medium text-body"
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
            className="inline-flex items-center gap-1 text-sm text-fg-brand hover:underline"
          >
            Open full assessment →
          </a>
        </Section>
      </aside>
    </>
  );
}

interface FlipReadySectionProps {
  ready: boolean;
  readyAt: string | null;
  onToggle: (next: boolean) => Promise<boolean>;
  disabled: boolean;
}

function FlipReadySection({ ready, readyAt, onToggle, disabled }: FlipReadySectionProps) {
  const [saving, setSaving] = useState(false);
  const handleClick = async () => {
    if (saving || disabled) return;
    setSaving(true);
    try {
      await onToggle(!ready);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section
      className={[
        "px-5 py-3 border-b border-[var(--color-border-default)] flex items-center justify-between gap-3",
        ready ? "bg-brand-softer" : "",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <p className="text-2xs uppercase tracking-wider text-body-subtle">Closer pickup</p>
        <p className="text-sm mt-0.5">
          {ready ? (
            <>
              <span className="text-fg-brand-strong font-medium">🚩 Ready for closer</span>
              {readyAt && (
                <span className="text-2xs text-body-subtle ml-2">
                  ({relativeDays(readyAt)} ago)
                </span>
              )}
            </>
          ) : disabled ? (
            <span className="text-body-subtle italic">Lead is closed; not pickable</span>
          ) : (
            <span className="text-body-subtle italic">Not yet queued for closer</span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={saving || disabled}
        className={[
          "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors",
          "focus:outline-none focus:ring-4 focus:ring-brand-medium",
          ready
            ? "bg-neutral-secondary-medium text-body hover:bg-neutral-tertiary-medium border border-[var(--color-border-default)]"
            : "bg-brand text-white hover:bg-brand-strong",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        {ready ? "Unmark" : "🚩 Mark ready"}
      </button>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-4 border-b border-[var(--color-border-default)] last:border-b-0">
      <h3 className="text-2xs uppercase tracking-wider text-body-subtle font-semibold mb-2">
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
      <dt className="text-2xs uppercase tracking-wider text-body-subtle">{label}</dt>
      <dd className="text-body break-words">{children}</dd>
    </div>
  );
}
