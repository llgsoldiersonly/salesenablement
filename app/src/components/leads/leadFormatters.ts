import type { LeadWithAssessment } from "../../lib/leads";

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function relativeDays(iso: string | null): string {
  const d = daysSince(iso);
  if (d == null) return "—";
  if (d === 0) return "today";
  if (d === 1) return "1d";
  return `${d}d`;
}

export function formatCents(cents: number | null): string {
  if (cents == null) return "—";
  if (cents === 0) return "$0";
  if (cents >= 100_000_000) return `$${(cents / 100_000_000).toFixed(1)}M`;
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(1)}k`;
  return `$${(cents / 100).toFixed(0)}`;
}

export function leadDisplayName(l: Pick<LeadWithAssessment, "firm_name">): string {
  return l.firm_name || "(Unnamed firm)";
}

export function leadLocation(l: Pick<LeadWithAssessment, "firm_city" | "firm_state">): string {
  return [l.firm_city, l.firm_state].filter(Boolean).join(", ");
}
