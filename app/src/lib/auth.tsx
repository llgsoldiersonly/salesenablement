/**
 * Auth context — wraps Supabase session + the user's sales_profiles row.
 *
 * Usage:
 *   <AuthProvider><App/></AuthProvider>
 *   const { user, profile, role, loading, signOut } = useAuth();
 *
 * `role` is one of "opener" | "closer" | "admin" | null (null while loading
 * or signed out). Use it to gate UI:
 *   if (role === "admin") <AdminNav/>
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase.js";
import type { Database } from "./database.types.js";

export type SalesRole = Database["public"]["Enums"]["sales_role"];
export type SalesProfile = Database["public"]["Tables"]["sales_profiles"]["Row"];

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: SalesProfile | null;
  role: SalesRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SalesProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("sales_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load profile:", error.message);
      setProfile(null);
      return;
    }
    setProfile(data);

    // Throttle last_seen_at writes: skip if bumped in the last 10 minutes.
    const key = `llg.lastSeenBump.${userId}`;
    const last = Number(localStorage.getItem(key) ?? 0);
    const now = Date.now();
    if (now - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(now));
      void supabase
        .from("sales_profiles")
        .update({ last_seen_at: new Date(now).toISOString() })
        .eq("id", userId);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        void loadProfile(data.session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next);
      if (next?.user) {
        void loadProfile(next.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    // Wipe per-call state so the next user on this device doesn't inherit
    // the previous user's notes, triggers, objections, or active assessment.
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith("llg.callNotes.") ||
            k.startsWith("llg.callTriggers.") ||
            k.startsWith("llg.callObjections.") ||
            k === "llg.activeAssessment.v2" ||
            k === "llg.briefs.v1")
        ) {
          keys.push(k);
        }
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore storage failures */
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      loading,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
