import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useIncomingCall } from "../lib/incomingCalls";
import { getLeadById, type LeadWithAssessment } from "../lib/leads";
import { leadDisplayName, leadLocation } from "./leads/leadFormatters";

/**
 * Global screen-pop toaster for incoming RC calls.
 *
 * Mounted once near the top of the tree. Subscribes via useIncomingCall;
 * when a ringing event lands, fetches the matched lead and renders a
 * dismissible card at the bottom-right corner. Click "Open Lead" to deep-
 * link into /leads with the lead pre-opened.
 *
 * Renders nothing if the user is not signed in or no call is ringing.
 */
export function IncomingCallToaster() {
  const { session } = useAuth();
  const event = useIncomingCall();
  const [lead, setLead] = useState<LeadWithAssessment | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal each time a new event lands
  useEffect(() => {
    setDismissed(false);
    setLead(null);
    if (!event?.matchedLeadId) return;
    let cancelled = false;
    void getLeadById(event.matchedLeadId).then((row) => {
      if (!cancelled) setLead(row);
    });
    return () => {
      cancelled = true;
    };
  }, [event?.sessionId, event?.matchedLeadId]);

  if (!session || !event || dismissed) return null;

  const openLead = () => {
    if (!event.matchedLeadId) return;
    // Deep-link into /leads with the lead pre-opened. LeadsApp reads
    // ?openLead= and sets activeLead.
    const url = `/leads?openLead=${event.matchedLeadId}`;
    if (window.location.pathname === "/leads") {
      // Already there — just trigger a hash to re-read the param
      window.history.replaceState(null, "", url);
      window.dispatchEvent(new Event("llg:openLead"));
    } else {
      window.location.href = url;
    }
  };

  const formattedNumber = event.callerNumber ?? "Unknown number";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-neutral-primary-soft rounded-[12px] shadow-xl border border-[var(--color-border-default)] overflow-hidden animate-[fadeIn_200ms_ease-out]"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-brand-soft text-fg-brand-strong flex items-center justify-center text-base ring-2 ring-brand-medium animate-pulse">
          ☎
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xs uppercase tracking-wider text-body-subtle">
            Incoming call
          </p>
          {lead ? (
            <>
              <p className="text-sm font-semibold text-heading truncate mt-0.5">
                {leadDisplayName(lead)}
              </p>
              <p className="text-2xs text-body-subtle truncate">
                {[leadLocation(lead), lead.firm_practice_area].filter(Boolean).join(" · ") ||
                  "—"}
              </p>
              <p className="text-2xs text-body-subtle mt-0.5">{formattedNumber}</p>
            </>
          ) : event.matchedLeadId ? (
            <p className="text-sm text-body mt-0.5 animate-pulse">Loading lead…</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-heading mt-0.5">{formattedNumber}</p>
              <p className="text-2xs text-body-subtle italic mt-0.5">
                Not in any lead yet
              </p>
            </>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="dismiss"
          className="shrink-0 -mt-1 -mr-1 w-7 h-7 rounded-[6px] inline-flex items-center justify-center text-body-subtle hover:bg-neutral-secondary-medium hover:text-heading transition-colors"
        >
          ✕
        </button>
      </div>
      {event.matchedLeadId && (
        <div className="px-4 pb-3">
          <button
            onClick={openLead}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] bg-brand text-white text-sm font-semibold hover:bg-brand-strong btn-glint focus:outline-none focus:ring-4 focus:ring-brand-medium transition-colors"
          >
            Open Lead →
          </button>
        </div>
      )}
    </div>
  );
}
