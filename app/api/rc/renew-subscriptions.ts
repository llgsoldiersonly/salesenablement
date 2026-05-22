/**
 * Vercel Cron: /api/rc/renew-subscriptions
 *
 * Runs daily (configured in vercel.json). Finds RC webhook subscriptions
 * expiring within 48 hours and renews them. RC caps subscriptions at 7-day
 * lifetime, so without renewal they go dark every week.
 *
 * Auth: Vercel Cron invokes with header `Authorization: Bearer <CRON_SECRET>`.
 * If CRON_SECRET isn't set, we allow any request (useful for local testing
 * but should be set in production).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getSubscriptionsDueForRenewal,
  renewTelephonySubscription,
} from "../../server/ringcentral.js";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Gate on Vercel's cron secret if configured
  if (CRON_SECRET) {
    const provided = req.headers["authorization"];
    if (provided !== `Bearer ${CRON_SECRET}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const dueUserIds = await getSubscriptionsDueForRenewal();
  const results: Array<{ userId: string; ok: boolean }> = [];

  for (const userId of dueUserIds) {
    try {
      const ok = await renewTelephonySubscription(userId);
      results.push({ userId, ok });
    } catch (err) {
      console.error("[cron/renew] failed for user", userId, err);
      results.push({ userId, ok: false });
    }
  }

  res.status(200).json({
    checked: dueUserIds.length,
    renewed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
