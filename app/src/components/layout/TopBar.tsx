import { useState } from "react";
import { CTAButton } from "../ui/Button";
import { DotBadge } from "../ui/Badge";
import { Logo } from "../ui/Logo";
import { ShareButton } from "../ShareButton";
import { NotificationBell } from "../NotificationBell";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import { RingCentralConnect } from "../RingCentralConnect";
import type { ProbeReport, TabId } from "../../types";

// Opener: simplified prospecting tools only — no calculator or activity log
const OPENER_TABS: { id: TabId; label: string }[] = [
  { id: "overview",    label: "Overview" },
  { id: "intake",      label: "Site Audit" },
  { id: "competitors", label: "Competitors" },
  { id: "notes",       label: "Notes" },
];

// Closer: full suite including ROAS calculator and activity history
const CLOSER_TABS: { id: TabId; label: string }[] = [
  { id: "overview",    label: "Overview" },
  { id: "intake",      label: "Site Audit" },
  { id: "competitors", label: "Competitors" },
  { id: "calculator",  label: "Calculator" },
  { id: "notes",       label: "Notes" },
  { id: "activity",    label: "Activity" },
];

interface TopBarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  callStatus: "idle" | "active" | "closed";
  onCloseDeal?: () => void;
  onLoadReport?: () => void;
  report?: ProbeReport;
  onOpenSidebar?: () => void;
}

export function TopBar({ activeTab, onTabChange, callStatus, onCloseDeal, onLoadReport, report, onOpenSidebar }: TopBarProps) {
  const { profile, role, signOut } = useAuth();
  const { resolvedTheme, toggle: toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = role === "opener" ? OPENER_TABS : CLOSER_TABS;
  const initials = (profile?.full_name ?? profile?.email ?? "?")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "";

  return (
    <header className="shrink-0 bg-surface border-b border-[var(--color-border)] flex flex-col">
      {/* Brand row */}
      <div className="flex items-center justify-between px-3 sm:px-6 pt-3 sm:pt-4 pb-2 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              aria-label="open menu"
              className="md:hidden w-8 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md flex items-center justify-center text-subtle text-base"
            >
              ☰
            </button>
          )}
          <Logo size={36} />
          <span className="text-sm sm:text-base font-semibold text-heading tracking-tight truncate">
            <span className="hidden sm:inline">Legal Growth Dashboard</span>
            <span className="sm:hidden">LLG</span>
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {callStatus === "active" && (
            <span className="hidden sm:inline-flex">
              <DotBadge color="green" label="Closer Call Active" />
            </span>
          )}
          {/* Icon buttons — hide secondary ones on mobile */}
          <button
            onClick={onLoadReport}
            aria-label="load report"
            title="Load probe report"
            className="hidden sm:flex w-8 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md active:nm-inset transition-all duration-200 items-center justify-center text-subtle text-sm"
          >
            📁
          </button>
          {report && <span className="hidden sm:inline-flex"><ShareButton report={report} variant="icon" /></span>}
          <a
            href="/leads"
            aria-label="open leads portal"
            title="Open Leads Portal"
            className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md active:nm-inset transition-all duration-200 text-xs font-semibold uppercase tracking-wide text-brand whitespace-nowrap"
          >
            <span aria-hidden>◰</span>
            <span>Leads</span>
          </a>
          <button
            onClick={toggleTheme}
            aria-label={resolvedTheme === "dark" ? "switch to light theme" : "switch to dark theme"}
            title={resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="w-8 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md active:nm-inset transition-all duration-200 flex items-center justify-center text-subtle text-sm"
          >
            {resolvedTheme === "dark" ? "☀" : "☾"}
          </button>
          <NotificationBell />
          <button
            aria-label="history"
            className="hidden sm:flex w-8 h-8 rounded-[8px] bg-surface shadow-sm hover:shadow-md active:nm-inset transition-all duration-200 items-center justify-center text-subtle text-sm"
          >
            ⟳
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="account"
              title={`${profile?.full_name ?? profile?.email ?? ""} · ${roleLabel}`}
              className="w-8 h-8 rounded-[8px] bg-brand/10 text-brand text-xs font-semibold shadow-sm hover:shadow-md active:nm-inset transition-all duration-200 flex items-center justify-center"
            >
              {initials || "○"}
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 mt-2 w-56 bg-surface rounded-[8px] shadow-xl border border-[var(--color-border)] z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-[var(--color-border)]">
                    <p className="text-sm font-medium text-heading truncate">
                      {profile?.full_name ?? profile?.email}
                    </p>
                    {profile?.full_name && (
                      <p className="text-xs text-subtle truncate">{profile.email}</p>
                    )}
                    {roleLabel && (
                      <span className="inline-block mt-1 text-2xs uppercase tracking-wider text-brand font-semibold">
                        {roleLabel}
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2 border-b border-[var(--color-border)]">
                    <RingCentralConnect />
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-body hover:bg-[var(--color-bg-subtle)] transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
          <CTAButton
            size="sm"
            onClick={onCloseDeal}
            className={callStatus === "active" ? "!bg-[var(--color-danger)]" : ""}
          >
            {callStatus === "active" ? "End Call" : "Start Call"}
          </CTAButton>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex items-end px-3 sm:px-6 border-t border-[var(--color-border)] overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={[
                "px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors duration-150 whitespace-nowrap",
                "rounded-t-[8px] -mb-px border-b-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                isActive
                  ? "text-brand border-brand"
                  : "text-subtle border-transparent hover:text-heading hover:border-[var(--color-border-strong)]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
