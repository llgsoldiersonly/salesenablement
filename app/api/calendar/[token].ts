/**
 * Vercel function: GET /api/calendar/[token].ics
 *
 * Returns an iCalendar feed of the user's upcoming follow-ups so they can
 * subscribe from Outlook, Google Calendar, or Apple Calendar.
 *
 * Auth model: the token in the URL is a per-user uuid stored on
 * sales_profiles.calendar_token. Anyone with the URL can read that user's
 * follow-ups — same shape as Google's secret iCal URLs. The user can rotate
 * the token via the regenerate_calendar_token() RPC.
 *
 * We use the Supabase service-role key here to bypass RLS (the URL token
 * already gates access). Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in
 * the Vercel project env.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

interface CallRow {
  id: string;
  next_action_at: string;
  outcome: string | null;
  closer_id: string | null;
  opener_id: string;
  assessment_id: string;
  sales_assessments: {
    firm_city: string;
    firm_state: string;
  } | null;
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toIcsDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function buildIcs(rows: CallRow[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LLG Sales Enablement//Follow-ups//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Sales Follow-ups",
    "X-WR-TIMEZONE:UTC",
  ];

  const now = toIcsDate(new Date().toISOString());

  for (const c of rows) {
    if (!c.next_action_at) continue;
    const a = c.sales_assessments;
    const titleVerb =
      c.outcome === "callback_requested" ? "Callback" : "Follow-up";
    const location = [a?.firm_city, a?.firm_state].filter(Boolean).join(", ");
    const summary = location ? `${titleVerb}: ${location}` : titleVerb;

    const start = new Date(c.next_action_at);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    lines.push(
      "BEGIN:VEVENT",
      `UID:call-${c.id}@llg-sales`,
      `DTSTAMP:${now}`,
      `DTSTART:${toIcsDate(start.toISOString())}`,
      `DTEND:${toIcsDate(end.toISOString())}`,
      `SUMMARY:${escapeIcs(summary)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n") + "\r\n";
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).send("Calendar feed not configured (missing Supabase env).");
    return;
  }

  const rawToken = req.query.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  if (!token) {
    res.status(400).send("Missing token.");
    return;
  }
  // Strip optional .ics suffix from the path param.
  const cleanToken = token.replace(/\.ics$/i, "");
  if (!/^[0-9a-f-]{36}$/i.test(cleanToken)) {
    res.status(400).send("Invalid token.");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userId, error: userErr } = await supabase.rpc("lookup_calendar_user", {
    p_token: cleanToken,
  });
  if (userErr || !userId) {
    res.status(404).send("Calendar not found.");
    return;
  }

  const { data: rows, error: callsErr } = await supabase
    .from("sales_calls")
    .select(
      "id, next_action_at, outcome, closer_id, opener_id, assessment_id, sales_assessments!inner(firm_city, firm_state)",
    )
    .or(`closer_id.eq.${userId},opener_id.eq.${userId}`)
    .not("next_action_at", "is", null);

  if (callsErr) {
    res.status(500).send(`Query failed: ${callsErr.message}`);
    return;
  }

  const ics = buildIcs((rows ?? []) as unknown as CallRow[]);

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="sales-follow-ups.ics"`);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).send(ics);
}
