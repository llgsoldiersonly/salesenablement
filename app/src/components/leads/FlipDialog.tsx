import { useEffect, useState } from "react";
import {
  flipLead,
  listAvailableClosers,
  type AvailableCloser,
} from "../../lib/leads";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "../ui/Modal";
import { Button, CTAButton } from "../ui/Button";

/**
 * Live-flip picker. The opener has a prospect on the phone, clicks "Flip
 * to closer" in the lead drawer, picks a destination closer, confirms.
 *
 * On confirm we POST /api/leads/flip → SMS goes to the closer's RC, lead
 * row gets stamped with flipped_to_closer_id + ready_for_closer = true.
 * The closer's screen-pop (B2) takes over from there.
 */

interface Props {
  open: boolean;
  leadId: string;
  firmName: string;
  onClose: () => void;
  onFlipped: () => void;
}

export function FlipDialog({ open, leadId, firmName, onClose, onFlipped }: Props) {
  const [closers, setClosers] = useState<AvailableCloser[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setSelectedId("");
    setClosers(null);
    void listAvailableClosers().then((rows) => {
      if (cancelled) return;
      setClosers(rows);
      // Pre-select first RC-connected closer if any
      const firstConnected = rows.find((r) => r.rc_connected);
      if (firstConnected) setSelectedId(firstConnected.id);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const submit = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    const result = await flipLead(leadId, selectedId);
    setBusy(false);
    if (!result.ok) {
      setError(result.hint ?? result.error ?? "Flip failed");
      return;
    }
    onFlipped();
    onClose();
  };

  const connected = (closers ?? []).filter((c) => c.rc_connected);
  const notConnected = (closers ?? []).filter((c) => !c.rc_connected);
  const selectable = connected.length > 0;

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel="Flip lead to closer">
      <ModalHeader
        onClose={onClose}
        subtitle={`Send an SMS with the lead context to a closer's RingCentral, then do the warm transfer in RC as usual. ${firmName}`}
      >
        Flip to closer
      </ModalHeader>
      <ModalBody>
        {closers == null ? (
          <p className="text-sm text-body-subtle animate-pulse">Loading closers…</p>
        ) : !selectable ? (
          <div className="bg-warning-soft border border-[var(--color-border-warning-subtle)] rounded-[8px] p-3">
            <p className="text-sm text-fg-warning">
              No closers have connected RingCentral yet. Ask them to open the app
              and click <strong>Connect RingCentral</strong>, then try again.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-body-subtle uppercase tracking-wider mb-1">
              Destination closer
            </p>
            {connected.map((c) => (
              <label
                key={c.id}
                className={[
                  "flex items-center gap-3 p-3 rounded-[8px] border cursor-pointer transition-colors",
                  selectedId === c.id
                    ? "bg-brand-softer border-brand"
                    : "bg-neutral-primary-soft border-[var(--color-border-default)] hover:bg-neutral-secondary-medium",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="flip-closer"
                  value={c.id}
                  checked={selectedId === c.id}
                  onChange={() => setSelectedId(c.id)}
                  className="accent-[var(--color-brand)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-heading truncate">
                    {c.full_name ?? c.email}
                  </p>
                  <p className="text-2xs text-body-subtle truncate">{c.email}</p>
                </div>
                <span className="text-2xs px-2 py-0.5 rounded-full bg-success-soft text-fg-success-strong border border-[var(--color-border-success-subtle)]">
                  ☎ Ready
                </span>
              </label>
            ))}
            {notConnected.length > 0 && (
              <details className="mt-2">
                <summary className="text-2xs text-body-subtle cursor-pointer">
                  {notConnected.length} closer(s) without RingCentral connected
                </summary>
                <ul className="mt-2 text-xs text-body-subtle list-disc list-inside">
                  {notConnected.map((c) => (
                    <li key={c.id}>{c.full_name ?? c.email}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        {error && (
          <div className="mt-3 bg-danger-soft border border-[var(--color-border-danger-subtle)] rounded-[8px] p-3">
            <p className="text-xs text-fg-danger-strong">{error}</p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="neutral" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <CTAButton
          type="button"
          onClick={() => void submit()}
          disabled={busy || !selectedId || !selectable}
        >
          {busy ? "Sending…" : "Send flip SMS"}
        </CTAButton>
      </ModalFooter>
    </Modal>
  );
}
