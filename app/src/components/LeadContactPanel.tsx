import { useEffect, useState } from "react";
import { Button, CTAButton } from "./ui/Button";
import {
  formatPhoneDisplay,
  getLeadContact,
  phoneTelHref,
  updateLeadContact,
  type LeadContact,
} from "../lib/leadContact";

const BLANK: LeadContact = { name: null, phone: null, email: null, role: null };

const inputClass =
  "w-full bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-sm text-body outline-none focus:ring-2 focus:ring-brand";

interface LeadContactPanelProps {
  assessmentId: string;
}

export function LeadContactPanel({ assessmentId }: LeadContactPanelProps) {
  const [contact, setContact] = useState<LeadContact>(BLANK);
  const [draft, setDraft] = useState<LeadContact>(BLANK);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getLeadContact(assessmentId).then((c) => {
      if (cancelled) return;
      setContact(c);
      setDraft(c);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  const startEdit = () => {
    setDraft(contact);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(contact);
    setEditing(false);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    await updateLeadContact(assessmentId, draft);
    setContact(draft);
    setEditing(false);
    setSaving(false);
  };

  const isEmpty = !contact.name && !contact.phone && !contact.email && !contact.role;
  const phoneDisplay = formatPhoneDisplay(contact.phone);
  const phoneHref = phoneTelHref(contact.phone);

  return (
    <div className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-heading flex items-center gap-2">
          <span aria-hidden="true">👤</span> Decision Maker
        </h2>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-2xs uppercase tracking-wider font-semibold text-subtle hover:text-heading"
          >
            {isEmpty ? "Add" : "Edit"}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-subtle animate-pulse">Loading…</p>
      ) : editing ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input
              className={inputClass}
              value={draft.name ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Sarah Olson"
              disabled={saving}
            />
          </Field>
          <Field label="Title / Role">
            <input
              className={inputClass}
              value={draft.role ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
              placeholder="Managing Partner"
              disabled={saving}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputClass}
              type="tel"
              value={draft.phone ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="(406) 555-0142"
              disabled={saving}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputClass}
              type="email"
              value={draft.email ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="sarah@firm.com"
              disabled={saving}
            />
          </Field>
          <div className="col-span-2 flex justify-end gap-2 mt-1">
            <Button variant="neutral" size="sm" onClick={cancel} disabled={saving}>
              Cancel
            </Button>
            <CTAButton size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </CTAButton>
          </div>
        </div>
      ) : isEmpty ? (
        <p className="text-xs text-subtle">
          No contact saved yet. Click <strong>Add</strong> to record the decision-maker's
          name and phone so this lead is easy to pull back up.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {contact.name && (
            <Stat label="Name">
              <span className="font-medium text-heading">{contact.name}</span>
              {contact.role && <span className="text-subtle"> · {contact.role}</span>}
            </Stat>
          )}
          {phoneDisplay && (
            <Stat label="Phone">
              {phoneHref ? (
                <a href={phoneHref} className="text-brand hover:underline font-medium tabular-nums">
                  {phoneDisplay}
                </a>
              ) : (
                <span className="font-medium text-body tabular-nums">{phoneDisplay}</span>
              )}
            </Stat>
          )}
          {contact.email && (
            <Stat label="Email">
              <a
                href={`mailto:${contact.email}`}
                className="text-brand hover:underline font-medium truncate block"
              >
                {contact.email}
              </a>
            </Stat>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-2xs font-semibold uppercase tracking-wider text-subtle">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-2xs uppercase tracking-wider text-subtle font-semibold">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}
