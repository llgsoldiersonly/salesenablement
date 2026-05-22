import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Editable fields for the lead detail drawer.
 *
 * Pattern: click the value to enter edit mode, type, blur or press Enter to
 * save, press Escape to cancel. Save is optimistic — caller controls the
 * actual mutation; if it fails, caller should refresh state.
 *
 *   <EditableRow label="DM name" value={lead.decision_maker_name}
 *                onSave={(v) => onPatch({ decision_maker_name: v })}
 *                placeholder="Not captured yet" />
 *
 * Used inside the drawer's existing two-column DefList layout, so each row
 * renders as `<dt label> <dd editor>`.
 */

interface BaseProps {
  label: string;
  /** Disable to make the row read-only (e.g. closer viewing an opener's lead). */
  disabled?: boolean;
}

/* ── Single-line text ─────────────────────────────────────────────────── */

interface EditableRowProps extends BaseProps {
  value: string | null;
  onSave: (next: string | null) => Promise<unknown> | void;
  placeholder?: string;
  type?: "text" | "email" | "tel";
}

export function EditableRow({
  label,
  value,
  onSave,
  placeholder = "—",
  type = "text",
  disabled = false,
}: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Keep local draft in sync if the parent value changes while not editing
  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : trimmed;
    if (next === (value ?? null)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  return (
    <Row label={label}>
      {editing ? (
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit();
            if (e.key === "Escape") cancel();
          }}
          disabled={saving}
          className="w-full bg-neutral-primary-soft rounded-[6px] border border-brand px-2 py-1 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-brand"
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(true)}
          className={[
            "w-full text-left px-2 py-1 -mx-2 rounded-[6px] text-sm break-words",
            value ? "text-body" : "text-body-subtle italic",
            disabled
              ? "cursor-default"
              : "hover:bg-neutral-secondary-medium cursor-text",
          ].join(" ")}
          title={disabled ? undefined : "Click to edit"}
        >
          {value || placeholder}
        </button>
      )}
    </Row>
  );
}

/* ── Multi-line textarea ──────────────────────────────────────────────── */

interface EditableTextareaProps extends BaseProps {
  value: string | null;
  onSave: (next: string | null) => Promise<unknown> | void;
  placeholder?: string;
  rows?: number;
}

export function EditableTextareaRow({
  label,
  value,
  onSave,
  placeholder = "Empty",
  rows = 4,
  disabled = false,
}: EditableTextareaProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : trimmed;
    if (next === (value ?? null)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  return (
    <div>
      <div className="text-2xs uppercase tracking-wider text-body-subtle font-semibold mb-1.5">
        {label}
      </div>
      {editing ? (
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            // Don't auto-save on Enter; lets user write multi-line notes
          }}
          rows={rows}
          disabled={saving}
          className="w-full bg-neutral-primary-soft rounded-[6px] border border-brand px-2 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-brand resize-y"
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(true)}
          className={[
            "w-full text-left px-2 py-1.5 -mx-2 rounded-[6px] text-sm whitespace-pre-wrap break-words min-h-[56px]",
            value ? "text-body" : "text-body-subtle italic",
            disabled
              ? "cursor-default"
              : "hover:bg-neutral-secondary-medium cursor-text",
          ].join(" ")}
        >
          {value || placeholder}
        </button>
      )}
    </div>
  );
}

/* ── Boolean toggle inline ────────────────────────────────────────────── */

interface EditableCheckboxRowProps extends BaseProps {
  value: boolean;
  onSave: (next: boolean) => Promise<unknown> | void;
  trueLabel?: string;
  falseLabel?: string;
}

export function EditableCheckboxRow({
  label,
  value,
  onSave,
  trueLabel = "✓ Confirmed",
  falseLabel = "Not confirmed",
  disabled = false,
}: EditableCheckboxRowProps) {
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    if (disabled || saving) return;
    setSaving(true);
    try {
      await onSave(!value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Row label={label}>
      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => void toggle()}
        className={[
          "inline-flex items-center gap-2 px-2 py-1 -mx-2 rounded-[6px] text-sm transition-colors",
          value ? "text-fg-success-strong font-medium" : "text-body-subtle italic",
          disabled || saving
            ? "cursor-default"
            : "hover:bg-neutral-secondary-medium cursor-pointer",
        ].join(" ")}
      >
        {value ? trueLabel : falseLabel}
      </button>
    </Row>
  );
}

/* ── Shared layout primitive ──────────────────────────────────────────── */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2 text-sm">
      <dt className="text-2xs uppercase tracking-wider text-body-subtle">{label}</dt>
      <dd className="text-body break-words">{children}</dd>
    </div>
  );
}
