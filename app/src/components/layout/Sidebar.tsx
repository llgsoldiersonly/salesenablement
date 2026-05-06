import { CTAButton } from "../ui/Button";
import { Logo } from "../ui/Logo";

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "prospect",   label: "Prospect Overview",  icon: "👤" },
  { id: "conversion", label: "Conversion Metrics",  icon: "📈" },
  { id: "growth",     label: "Growth Engine",       icon: "📊" },
  { id: "strategy",   label: "Strategy Notes",      icon: "📋" },
];

interface SidebarProps {
  activeNav: string;
  onNavChange: (id: string) => void;
  firmName: string;
  onNewAssessment?: () => void;
  onBackToQueue?: () => void;
  userName?: string;
  userRole?: string;
}

export function Sidebar({ activeNav, onNavChange, firmName, onNewAssessment, onBackToQueue, userName, userRole }: SidebarProps) {
  return (
    <aside className="w-sidebar shrink-0 h-full bg-surface border-r border-[var(--color-border)] flex flex-col py-6 px-3 gap-1">
      {/* Brand mark */}
      <div className="flex items-center gap-2 px-3 mb-5">
        <Logo size={32} />
        <div className="leading-tight">
          <p className="text-xs font-bold uppercase tracking-widest text-heading">
            LLG
          </p>
          <p className="text-2xs text-subtle">Sales Slayers</p>
        </div>
      </div>

      {/* User context */}
      {(userName || userRole) && (
        <div className="px-3 mb-5">
          {userName && (
            <p className="text-xs font-semibold text-heading truncate mb-0.5">{userName}</p>
          )}
          {userRole && (
            <p className="text-2xs uppercase tracking-wider text-subtle font-medium">{userRole}</p>
          )}
        </div>
      )}

      {/* Back to queue (closers only) */}
      {onBackToQueue && (
        <button
          onClick={onBackToQueue}
          className="flex items-center gap-2 mx-3 mb-3 px-3 py-1.5 rounded-[8px] text-2xs uppercase tracking-wider font-semibold text-subtle hover:text-brand hover:shadow-sm transition-all duration-200"
        >
          <span aria-hidden="true">←</span> Lead Queue
        </button>
      )}

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavChange(item.id)}
              className={[
                "flex items-center gap-3 w-full px-3 py-2 rounded-[8px]",
                "text-sm font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                isActive
                  ? "nm-inset text-brand"
                  : "text-body hover:shadow-sm hover:text-heading",
              ].join(" ")}
            >
              <span className="text-base w-5 text-center" aria-hidden="true">
                {item.icon}
              </span>
              <span className="uppercase text-xs tracking-wider font-semibold">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom: settings + CTA */}
      <div className="flex flex-col gap-3 mt-4 px-1">
        <button className="flex items-center gap-3 px-3 py-2 rounded-[8px] text-subtle text-xs font-semibold uppercase tracking-wider hover:shadow-sm hover:text-heading transition-all duration-200">
          <span aria-hidden="true">⚙️</span> Settings
        </button>
        <CTAButton size="md" className="w-full text-xs tracking-widest" onClick={onNewAssessment}>
          + New Assessment
        </CTAButton>
        <p className="text-2xs text-subtle text-center truncate px-1">{firmName}</p>
      </div>
    </aside>
  );
}
