/**
 * Persists generated briefs.
 * - localStorage: fast, offline-capable, keyed by firm name+url
 * - Supabase sales_briefs: cross-device, cross-user visibility
 */

import { supabase } from "./supabase.js";

const KEY = "llg.briefs.v1";

export interface StoredBrief {
  firmKey: string;
  text: string;
  generatedAt: string;
  usage?: { input: number; output: number; cache_read: number; cache_write: number };
}

export function firmKey(name: string, url: string): string {
  return `${name.toLowerCase().replace(/\s+/g, "-")}::${url.toLowerCase()}`;
}

function read(): Record<string, StoredBrief> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, StoredBrief>): void {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function getBrief(key: string): StoredBrief | null {
  return read()[key] ?? null;
}

export function saveBrief(brief: StoredBrief): void {
  const all = read();
  all[brief.firmKey] = brief;
  write(all);
}

export function deleteBrief(key: string): void {
  const all = read();
  delete all[key];
  write(all);
}

// ── Supabase-backed helpers ───────────────────────────────────────────────────

export async function saveBriefToSupabase(
  assessmentId: string,
  text: string,
  usage?: StoredBrief["usage"],
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  await supabase.from("sales_briefs").insert({
    assessment_id: assessmentId,
    generated_by: userId,
    body_md: text,
    input_tokens: usage?.input ?? null,
    output_tokens: usage?.output ?? null,
    cache_read_tokens: usage?.cache_read ?? null,
    cache_write_tokens: usage?.cache_write ?? null,
  });
}

export interface SupabaseBrief {
  id: string;
  bodyMd: string;
  createdAt: string;
  generatedByName: string | null;
  usage: StoredBrief["usage"];
}

export async function loadLatestBriefFromSupabase(
  assessmentId: string,
): Promise<SupabaseBrief | null> {
  const { data } = await supabase
    .from("sales_briefs")
    .select("id, body_md, created_at, generated_by, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const row = data as {
    id: string;
    body_md: string;
    created_at: string;
    generated_by: string;
    input_tokens: number | null;
    output_tokens: number | null;
    cache_read_tokens: number | null;
    cache_write_tokens: number | null;
  };

  // Best-effort: look up the generator's display name
  let generatedByName: string | null = null;
  const { data: profile } = await supabase
    .from("sales_profiles")
    .select("full_name, email")
    .eq("id", row.generated_by)
    .maybeSingle();
  if (profile) {
    generatedByName = (profile as { full_name: string | null; email: string }).full_name
      ?? (profile as { full_name: string | null; email: string }).email;
  }

  return {
    id: row.id,
    bodyMd: row.body_md,
    createdAt: row.created_at,
    generatedByName,
    usage:
      row.input_tokens != null
        ? {
            input: row.input_tokens,
            output: row.output_tokens ?? 0,
            cache_read: row.cache_read_tokens ?? 0,
            cache_write: row.cache_write_tokens ?? 0,
          }
        : undefined,
  };
}
