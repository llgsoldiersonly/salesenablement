import { useEffect, useState } from "react";
import { Button, CTAButton } from "./ui/Button";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./ui/Modal";
import { inputClass } from "./ui/Input";
import { supabase } from "./../lib/supabase";

interface CalendarSyncDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CalendarSyncDialog({ open, onClose }: CalendarSyncDialogProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("sales_profiles")
        .select("calendar_token")
        .eq("id", uid)
        .maybeSingle();
      if (cancelled) return;
      setToken(data?.calendar_token ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const url = token ? `${window.location.origin}/api/calendar/${token}.ics` : null;

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const regenerate = async () => {
    if (regenerating) return;
    if (!confirm("Generate a new URL? Old subscriptions will stop syncing.")) return;
    setRegenerating(true);
    const { data, error } = await supabase.rpc("regenerate_calendar_token");
    if (!error && data) setToken(data as string);
    setRegenerating(false);
  };

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel="Calendar Sync">
      <ModalHeader
        onClose={onClose}
        subtitle="Subscribe from Outlook, Google, or Apple Calendar. New follow-ups and callbacks appear automatically — no app to install."
      >
        Calendar Sync
      </ModalHeader>

      <ModalBody>
        {loading ? (
          <p className="text-sm text-body-subtle animate-pulse">Loading…</p>
        ) : !url ? (
          <p className="text-sm text-fg-danger">Could not load your calendar URL.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={url}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className={`${inputClass} text-xs font-mono`}
              />
              <Button variant="neutral" size="sm" onClick={() => void copy()}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>

            <div className="bg-neutral-secondary-soft rounded-[8px] border border-[var(--color-border-default)] p-3">
              <h3 className="text-2xs uppercase tracking-wider font-semibold text-heading mb-2">
                How to subscribe
              </h3>
              <ul className="text-xs text-body leading-relaxed flex flex-col gap-1.5">
                <li>
                  <strong className="text-heading">Outlook (web):</strong> Calendar → Add calendar → Subscribe from web → paste URL.
                </li>
                <li>
                  <strong className="text-heading">Outlook (desktop):</strong> File → Account Settings → Internet Calendars → New → paste URL.
                </li>
                <li>
                  <strong className="text-heading">Google Calendar:</strong> Other calendars → + → From URL → paste URL.
                </li>
                <li>
                  <strong className="text-heading">Apple Calendar:</strong> File → New Calendar Subscription → paste URL.
                </li>
              </ul>
            </div>

            <p className="text-2xs text-body-subtle leading-relaxed">
              Anyone with this URL can read your follow-up schedule. Treat it like a password — if it's
              ever exposed, regenerate it below.
            </p>
          </div>
        )}
      </ModalBody>

      <ModalFooter className="justify-between">
        <button
          onClick={() => void regenerate()}
          disabled={regenerating || loading || !url}
          className="text-2xs uppercase tracking-wider font-semibold text-body-subtle hover:text-fg-danger disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {regenerating ? "Generating…" : "Regenerate URL"}
        </button>
        <CTAButton size="sm" onClick={onClose}>Done</CTAButton>
      </ModalFooter>
    </Modal>
  );
}
