import { useEffect, useState } from "react";
import { Button, CTAButton } from "./ui/Button";
import { supabase } from "../lib/supabase";

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

  if (!open) return null;

  const url = token
    ? `${window.location.origin}/api/calendar/${token}.ics`
    : null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
      <div
        className="relative w-full max-w-lg bg-surface rounded-[12px] shadow-2xl border border-[var(--color-border)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-heading">Calendar Sync</h2>
          <p className="text-xs text-subtle mt-1">
            Subscribe from Outlook, Google, or Apple Calendar. New follow-ups and
            callbacks will appear automatically — no app to install.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-subtle animate-pulse">Loading…</p>
        ) : !url ? (
          <p className="text-sm text-[var(--color-danger)]">
            Could not load your calendar URL.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={url}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-xs text-body font-mono outline-none"
              />
              <Button variant="neutral" size="sm" onClick={() => void copy()}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>

            <div className="bg-surface rounded-[8px] border border-[var(--color-border)] p-3 mb-4">
              <h3 className="text-2xs uppercase tracking-wider font-semibold text-heading mb-2">
                How to subscribe
              </h3>
              <ul className="text-xs text-body leading-relaxed flex flex-col gap-1">
                <li>
                  <strong>Outlook (web):</strong> Calendar → Add calendar → Subscribe
                  from web → paste URL.
                </li>
                <li>
                  <strong>Outlook (desktop):</strong> File → Account Settings →
                  Internet Calendars → New → paste URL.
                </li>
                <li>
                  <strong>Google Calendar:</strong> Other calendars → + → From URL →
                  paste URL.
                </li>
                <li>
                  <strong>Apple Calendar:</strong> File → New Calendar Subscription →
                  paste URL.
                </li>
              </ul>
            </div>

            <p className="text-2xs text-subtle leading-relaxed">
              Anyone with this URL can read your follow-up schedule. Treat it like a
              password — if it's ever exposed, regenerate it below.
            </p>

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => void regenerate()}
                disabled={regenerating}
                className="text-2xs uppercase tracking-wider font-semibold text-subtle hover:text-[var(--color-danger)] disabled:opacity-50"
              >
                {regenerating ? "Generating…" : "Regenerate URL"}
              </button>
              <CTAButton size="sm" onClick={onClose}>
                Done
              </CTAButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
