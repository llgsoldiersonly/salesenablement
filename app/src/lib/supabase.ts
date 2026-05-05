/**
 * Supabase client (browser).
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time. These are
 * the publishable keys — safe to expose; row-level security in the database
 * is what protects data.
 *
 * If env vars are missing, we still construct a client (so dev imports don't
 * crash) but log a loud warning. Calls will fail at runtime.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const url = env.VITE_SUPABASE_URL ?? "";
const anonKey = env.VITE_SUPABASE_ANON_KEY ?? "";

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
