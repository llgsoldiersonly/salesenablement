import { useEffect, useRef, useState } from "react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "../lib/notifications";
import { supabase } from "../lib/supabase";
import { setActiveReport } from "../lib/storage";
import { useAuth } from "../lib/auth";

const TYPE_ICONS: Record<string, string> = {
  coach_note: "🎯",
  strategy_note: "📝",
  claim_takeover: "🔒",
  follow_up_due: "⏰",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface NotificationBellProps {
  /** Optional handler for clicking a notification with an assessment link.
   *  If absent, falls back to setting the active assessment in localStorage. */
  onOpenAssessment?: (assessmentId: string) => void;
}

export function NotificationBell({ onOpenAssessment }: NotificationBellProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const reload = async () => {
    setLoading(true);
    setItems(await getNotifications(30));
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-watch:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sales_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((n) => n.readAt === null).length;

  const handleClick = async (n: Notification) => {
    if (n.readAt === null) {
      await markNotificationRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    if (n.linkAssessmentId) {
      setActiveReport(n.linkAssessmentId);
      onOpenAssessment?.(n.linkAssessmentId);
    }
    setOpen(false);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt === null ? { ...n, readAt: now } : n)));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 rounded-full hover:bg-surface-2 flex items-center justify-center text-base transition-colors"
        title="Notifications"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-[var(--color-danger)] text-white text-2xs font-bold leading-none flex items-center justify-center tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-[8px] shadow-2xl border border-[var(--color-border)] z-50 max-h-[70vh] flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-heading">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => void handleMarkAll()}
                className="text-2xs uppercase tracking-wider font-semibold text-subtle hover:text-heading"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="text-xs text-subtle text-center py-8 animate-pulse">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-subtle text-center py-8">
                You're all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {items.map((n) => {
                  const isUnread = n.readAt === null;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => void handleClick(n)}
                        className={[
                          "w-full text-left px-4 py-3 flex gap-3 hover:bg-surface-2 transition-colors",
                          isUnread ? "bg-brand/5" : "",
                        ].join(" ")}
                      >
                        <span className="text-base shrink-0" aria-hidden="true">
                          {TYPE_ICONS[n.type] ?? "🔔"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={["text-xs leading-snug", isUnread ? "text-heading font-medium" : "text-body"].join(" ")}>
                            {n.body}
                          </p>
                          <p className="text-2xs text-subtle mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {isUnread && (
                          <span
                            className="shrink-0 w-2 h-2 rounded-full bg-brand mt-1.5"
                            aria-label="unread"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
