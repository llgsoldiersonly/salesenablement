import { useAuth } from "../lib/auth";
import { SignIn } from "./SignIn";
import { AdminTab } from "./tabs/AdminTab";
import { Logo } from "./ui/Logo";

export function AdminApp() {
  const { session, profile, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface">
        <Logo variant="full" size={96} className="animate-pulse" />
        <p className="text-sm text-subtle">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <SignIn portalName="Admin Portal" redirectPath="/admin" />;
  }

  if (role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface p-4">
        <Logo variant="full" size={64} />
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-heading mt-4">Access Denied</h2>
          <p className="text-sm text-subtle mt-2">
            This portal is for admin users only.{" "}
            {profile?.email && (
              <>
                You're signed in as <span className="font-medium text-body">{profile.email}</span>{" "}
                ({role ?? "no role"}).
              </>
            )}
          </p>
          <button
            onClick={() => void signOut()}
            className="mt-4 text-sm text-brand hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Admin header */}
      <header className="shrink-0 bg-surface border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <div>
            <span className="text-sm font-semibold text-heading">Admin Portal</span>
            <span className="ml-2 text-2xs uppercase tracking-wider text-brand font-semibold">
              Sales Enablement
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-xs text-subtle hover:text-body transition-colors"
          >
            → Rep Dashboard
          </a>
          <a
            href="/leads"
            className="text-xs text-subtle hover:text-body transition-colors"
          >
            → Leads
          </a>
          <div className="h-4 w-px bg-[var(--color-border)]" />
          <span className="text-xs text-subtle">
            {profile?.full_name ?? profile?.email}
          </span>
          <button
            onClick={() => void signOut()}
            className="text-xs text-subtle hover:text-[var(--color-danger)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Dashboard content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AdminTab />
      </div>
    </div>
  );
}
