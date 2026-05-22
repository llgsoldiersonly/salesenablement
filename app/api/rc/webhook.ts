/**
 * Vercel function: /api/rc/webhook
 *
 * RingCentral webhook receiver. Handles two distinct request types:
 *
 *  1. Subscription validation (RC sends a HEAD/GET/POST with a
 *     Validation-Token header right after we create or renew a subscription).
 *     We echo the token back in the response header and return 200.
 *
 *  2. Event delivery (RC sends POST with a Verification-Token header). We
 *     look up which subscription this is for, validate the token matches
 *     what we stored, and persist the event into sales_call_events.
 *
 * Auth: this endpoint is PUBLIC — RC reaches us with no auth header. Security
 * comes from the per-subscription verification token (a 24-byte random value
 * we generated and only RC + our DB know).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { lookupSubscriptionOwner, recordCallEvent } from "../../server/ringcentral.js";

function getHeader(req: VercelRequest, name: string): string | null {
  const val = req.headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0] ?? null;
  return typeof val === "string" ? val : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Subscription validation: RC sends Validation-Token header on initial
  // subscription create/renew. Echo it back to prove we own the endpoint.
  const validationToken = getHeader(req, "validation-token");
  if (validationToken) {
    res.setHeader("Validation-Token", validationToken);
    res.status(200).send(validationToken);
    return;
  }

  // From here on, this is an event delivery
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const verificationToken = getHeader(req, "verification-token");
  if (!verificationToken) {
    res.status(400).json({ error: "Missing Verification-Token header" });
    return;
  }

  // Parse the body — RC sends JSON
  let payload: { subscriptionId?: string; [k: string]: unknown };
  try {
    payload =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body as { subscriptionId?: string });
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  const subscriptionId = typeof payload.subscriptionId === "string" ? payload.subscriptionId : null;
  if (!subscriptionId) {
    res.status(400).json({ error: "Missing subscriptionId in payload" });
    return;
  }

  // Look up the owner + expected verification token
  const owner = await lookupSubscriptionOwner(subscriptionId);
  if (!owner) {
    console.warn("[rc/webhook] event for unknown subscription:", subscriptionId);
    // Still respond 200 so RC doesn't keep retrying or suspend the sub
    res.status(200).json({ ok: true });
    return;
  }

  if (owner.verificationToken !== verificationToken) {
    console.warn("[rc/webhook] token mismatch for subscription:", subscriptionId);
    // Reject — could be spoofing
    res.status(403).json({ error: "Verification token mismatch" });
    return;
  }

  // Persist the event. Future slices (B2 screen-pop, B3 flip log) will hook
  // additional handlers off this entry point.
  try {
    await recordCallEvent(owner.userId, subscriptionId, payload as Parameters<typeof recordCallEvent>[2]);
  } catch (err) {
    console.error("[rc/webhook] recordCallEvent failed:", err);
    // Acknowledge to RC anyway — we don't want infinite retries
  }

  res.status(200).json({ ok: true });
}
