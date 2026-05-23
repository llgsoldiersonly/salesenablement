/**
 * Subscribe to live RingCentral call events for the current user.
 *
 * Backed by Supabase Realtime postgres_changes on sales_call_events. RLS
 * already restricts visibility to events.user_id = auth.uid, so we just
 * subscribe to all INSERTs and the database does the right thing.
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export interface IncomingCallEvent {
  /** RC's telephonySessionId — groups all events of one physical call. */
  sessionId: string | null;
  direction: "Inbound" | "Outbound" | null;
  status: string | null;
  callerNumber: string | null;
  calleeNumber: string | null;
  /** Server-resolved match — null if no lead has this contact phone. */
  matchedLeadId: string | null;
  matchedAssessmentId: string | null;
  receivedAt: string;
}

// Events that mean "the phone is ringing, screen-pop now"
const RINGING_STATUSES = new Set(["Setup", "Proceeding", "Ringing"]);
// Events that mean "this call is over, drop the toaster"
const TERMINAL_STATUSES = new Set(["Disconnected", "Released"]);

interface SalesCallEventRow {
  rc_session_id: string | null;
  direction: string | null;
  status: string | null;
  caller_number: string | null;
  callee_number: string | null;
  matched_lead_id: string | null;
  matched_assessment_id: string | null;
  received_at: string;
}

function rowToEvent(row: SalesCallEventRow): IncomingCallEvent {
  return {
    sessionId: row.rc_session_id,
    direction: row.direction === "Inbound" || row.direction === "Outbound" ? row.direction : null,
    status: row.status,
    callerNumber: row.caller_number,
    calleeNumber: row.callee_number,
    matchedLeadId: row.matched_lead_id,
    matchedAssessmentId: row.matched_assessment_id,
    receivedAt: row.received_at,
  };
}

/**
 * Live "incoming call" state.
 *
 *  - Returns the current ringing call (if any), null otherwise.
 *  - Filters to direction=Inbound and ringing-status events.
 *  - Auto-clears when a Disconnected/Released event lands for the same session.
 *  - Skips duplicates (RC emits Setup AND Proceeding for the same ring).
 */
export function useIncomingCall(): IncomingCallEvent | null {
  const [current, setCurrent] = useState<IncomingCallEvent | null>(null);
  const seenSessionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase
      .channel("rc-incoming-calls")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sales_call_events" },
        (payload) => {
          const row = payload.new as SalesCallEventRow;
          if (row.direction !== "Inbound") return;

          // Ringing → show
          if (row.status && RINGING_STATUSES.has(row.status) && row.rc_session_id) {
            if (seenSessionsRef.current.has(row.rc_session_id)) return;
            seenSessionsRef.current.add(row.rc_session_id);
            setCurrent(rowToEvent(row));
            return;
          }

          // Terminal → drop if the same session
          if (row.status && TERMINAL_STATUSES.has(row.status) && row.rc_session_id) {
            setCurrent((prev) =>
              prev && prev.sessionId === row.rc_session_id ? null : prev,
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return current;
}
