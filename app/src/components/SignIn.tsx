/**
 * Sign-in screen — passwordless via Supabase Auth.
 *
 * Flow:
 *   1. User enters email
 *   2. We call supabase.auth.signInWithOtp(...)
 *   3. Supabase emails them BOTH a one-tap magic link AND a 6-digit code
 *   4. User either:
 *      (a) clicks the magic link — returns to our app with a session, OR
 *      (b) enters the 6-digit code on this screen and clicks Verify
 *   5. AuthProvider picks up the session and the app re-renders
 *
 * The code path exists because Microsoft 365 Safe Links pre-fetches every
 * URL in incoming mail, which consumes the magic-link token before the user
 * can click. Outlook/M365 users should use the code path. The link path
 * stays the default for everyone else.
 *
 * The first user to sign up is auto-promoted to admin via the
 * sales_handle_new_user() trigger. After that, admins invite teammates from
 * the Team page.
 */

import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { isEmailAllowed } from "../lib/invitations";
import { Button, CTAButton } from "./ui/Button";
import { inputClass } from "./ui/Input";
import { Logo } from "./ui/Logo";

type Phase = "form" | "sending" | "sent" | "verifying" | "error";

const OTP_ERROR_MESSAGES: Record<string, string> = {
  otp_expired: "Your sign-in link has expired or was already used. Please request a new one or use the 6-digit code from the email instead.",
  otp_disabled: "Magic link sign-in is not enabled. Contact your admin.",
  access_denied: "Sign-in was denied. Please request a new link.",
};

interface SignInProps {
  portalName?: string;
  redirectPath?: string;
}

export function SignIn({ portalName = "Sales Enablement", redirectPath = "" }: SignInProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pick up error params dropped into the URL hash by a failed magic-link redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("error=")) return;
    const params = new URLSearchParams(hash.slice(1));
    const errCode = params.get("error_code") ?? params.get("error") ?? "";
    const desc = params.get("error_description") ?? "";
    const friendly =
      OTP_ERROR_MESSAGES[errCode] ?? desc.replace(/\+/g, " ") ?? "Something went wrong. Please try again.";
    setErrorMsg(friendly);
    setPhase("error");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  // Phase 1 — submit email, request OTP (sends both link + code)
  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setPhase("sending");
    setErrorMsg(null);

    // Gate: only invited or existing users can sign in
    const allowed = await isEmailAllowed(email.trim());
    if (!allowed) {
      setErrorMsg("This email isn't on the team list. Ask an admin to invite you, then try again.");
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

  // Phase 2 — verify the 6-digit code typed in by the user
  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    const token = code.trim();
    if (!token) return;
    setPhase("verifying");
    setErrorMsg(null);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });

    if (error) {
      setErrorMsg(
        error.message === "Token has expired or is invalid"
          ? "That code is invalid or expired. Request a new one and try again."
          : error.message,
      );
      setPhase("sent");
      setCode("");
      return;
    }
    // On success, AuthProvider's onAuthStateChange picks up the new session
    // and the app re-renders without us needing to do anything more here.
  };

  const handleStartOver = () => {
    setPhase("form");
    setCode("");
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md bg-surface rounded-[8px] shadow-xl border border-[var(--color-border)] p-8">
        <div className="flex flex-col items-center gap-2 mb-8">
          <Logo variant="full" size={64} />
          <p className="text-xs text-subtle uppercase tracking-wider">{portalName}</p>
        </div>

        {phase === "sent" || phase === "verifying" ? (
          /* Step 2: code entry + reminder of the link option */
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
            <div className="text-center">
              <div className="text-3xl mb-1">📧</div>
              <h2 className="text-lg font-semibold text-heading">Check your email</h2>
              <p className="text-sm text-subtle mt-1">
                We sent a sign-in link and 6-digit code to{" "}
                <span className="font-medium text-body">{email}</span>.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="otp-code"
                className="text-xs font-semibold uppercase tracking-wider text-subtle"
              >
                6-digit code
              </label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                required
                autoFocus
                disabled={phase === "verifying"}
                className={`${inputClass} tracking-[0.4em] text-center text-lg font-mono`}
              />
              <p className="text-2xs text-subtle mt-1">
                If your Outlook is blocking the link, use the code instead.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-[#FEF2F2] border border-[var(--color-danger)]/30 rounded-[8px] p-3">
                <p className="text-xs text-[var(--color-danger)]">{errorMsg}</p>
              </div>
            )}

            <CTAButton type="submit" fullWidth disabled={phase === "verifying" || code.length !== 6}>
              {phase === "verifying" ? "Verifying…" : "Verify code"}
            </CTAButton>

            <div className="text-center">
              <span className="text-2xs text-subtle">or click the link in your email</span>
            </div>

            <Button variant="neutral" fullWidth onClick={handleStartOver} type="button">
              Use a different email
            </Button>
          </form>
        ) : (
          /* Step 1: email entry */
          <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-heading text-center">Sign in</h2>
            <p className="text-sm text-subtle text-center -mt-2">
              We'll email you a sign-in link and a 6-digit code.
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
              {phase === "sending" ? "Sending…" : "Send sign-in code"}
            </CTAButton>
          </form>
        )}
      </div>
    </div>
  );
}
