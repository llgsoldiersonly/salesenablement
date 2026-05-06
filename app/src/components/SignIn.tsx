/**
 * Sign-in screen — magic link only (no passwords).
 *
 * Flow:
 *   1. User enters email
 *   2. We call supabase.auth.signInWithOtp(...)
 *   3. Supabase emails them a one-tap link
 *   4. Clicking the link returns to our app with a session attached
 *   5. AuthProvider picks up the session and the app re-renders
 *
 * The first user to sign up is auto-promoted to admin via the
 * sales_handle_new_user() trigger. After that, admins invite teammates from
 * the Team page (Phase 2).
 */

import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { isEmailAllowed } from "../lib/invitations";
import { Button, CTAButton } from "./ui/Button";
import { Logo } from "./ui/Logo";

const inputClass =
  "w-full bg-surface shadow-inset rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-sm text-body outline-none focus:ring-2 focus:ring-brand";

type Phase = "form" | "sending" | "sent" | "error";

const OTP_ERROR_MESSAGES: Record<string, string> = {
  otp_expired: "Your sign-in link has expired or was already used. Please request a new one.",
  otp_disabled: "Magic link sign-in is not enabled. Contact your admin.",
  access_denied: "Sign-in was denied. Please request a new link.",
};

interface SignInProps {
  portalName?: string;
  redirectPath?: string;
}

export function SignIn({ portalName = "Sales Enablement", redirectPath = "" }: SignInProps) {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("error=")) return;
    const params = new URLSearchParams(hash.slice(1));
    const code = params.get("error_code") ?? params.get("error") ?? "";
    const desc = params.get("error_description") ?? "";
    const friendly = OTP_ERROR_MESSAGES[code] ?? desc.replace(/\+/g, " ") ?? "Something went wrong. Please try again.";
    setErrorMsg(friendly);
    setPhase("error");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setPhase("sending");
    setErrorMsg(null);

    // Gate: only invited or existing users can sign in
    const allowed = await isEmailAllowed(email.trim());
    if (!allowed) {
      setErrorMsg(
        "This email isn't on the team list. Ask an admin to invite you, then try again.",
      );
      setPhase("error");
      return;
    }

    const redirectTo = window.location.origin + (redirectPath || "");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setErrorMsg(error.message);
      setPhase("error");
      return;
    }
    setPhase("sent");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md bg-surface rounded-[8px] shadow-xl border border-[var(--color-border)] p-8">
        <div className="flex flex-col items-center gap-2 mb-8">
          <Logo variant="full" size={64} />
          <p className="text-xs text-subtle uppercase tracking-wider">{portalName}</p>
        </div>

        {phase === "sent" ? (
          <div className="flex flex-col gap-3 text-center">
            <div className="text-3xl">📧</div>
            <h2 className="text-lg font-semibold text-heading">Check your email</h2>
            <p className="text-sm text-subtle">
              We sent a sign-in link to <span className="font-medium text-body">{email}</span>.
              Click it to continue.
            </p>
            <Button
              variant="neutral"
              fullWidth
              onClick={() => {
                setPhase("form");
                setEmail("");
              }}
            >
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-heading text-center">Sign in</h2>
            <p className="text-sm text-subtle text-center -mt-2">
              We'll email you a one-tap sign-in link.
            </p>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider text-subtle"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@lucrativelegal.com"
                required
                autoFocus
                disabled={phase === "sending"}
                className={inputClass}
              />
            </div>

            {phase === "error" && errorMsg && (
              <div className="bg-[#FEF2F2] border border-[var(--color-danger)]/30 rounded-[8px] p-3">
                <p className="text-xs text-[var(--color-danger)]">{errorMsg}</p>
              </div>
            )}

            <CTAButton type="submit" fullWidth disabled={phase === "sending" || !email.trim()}>
              {phase === "sending" ? "Sending…" : "Send magic link"}
            </CTAButton>
          </form>
        )}
      </div>
    </div>
  );
}
