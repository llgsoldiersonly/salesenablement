import { useMemo, useState } from "react";
import type { LeadStatus, LeadWithAssessment } from "../../lib/leads";
import { StatusDropdown } from "./StatusBadge";
import { daysSince, formatCents, leadDisplayName, leadLocation, relativeDays } from "./leadFormatters";

type SortKey =
  | "firm"
  | "status"
  | "days_in_stage"
  | "coverage"
  | "quoted"
  | "updated";

type SortDir = "asc" | "desc";

interface Props {
  leads: LeadWithAssessment[];
  onOpenLead: (lead: LeadWithAssessment) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onTogglePin: (leadId: string, nextPinned: boolean) => void;
}

export function LeadsTableView({ leads, onOpenLead, onStatusChange, onTogglePin }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const copy = [...leads];
    copy.sort((a, b) => {
      // Pinned always floats to top regardless of sort key
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      let cmp = 0;
      switch (sortKey) {
        case "firm":
          cmp = leadDisplayName(a).localeCompare(leadDisplayName(b));
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "days_in_stage": {
          const da = daysSince(a.status_changed_at) ?? 0;
          const db = daysSince(b.status_changed_at) ?? 0;
          cmp = da - db;
          break;
        }
        case "coverage":
          cmp = (a.coverage_score ?? -1) - (b.coverage_score ?? -1);
          break;
        case "quoted":
          cmp = (a.quoted_value_cents ?? -1) - (b.quoted_value_cents ?? -1);
          break;
        case "updated":
          cmp = new Date(a.status_changed_at).getTime() - new Date(b.status_changed_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [leads, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "firm" || key === "status" ? "asc" : "desc");
    }
  }

  if (leads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-subtle">
        No leads match the current filters.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto scrollbar-thin">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="text-left text-2xs uppercase tracking-wider text-subtle">
            <Th className="w-8 sticky left-0 z-20 bg-surface"></Th>
            <Th
              onClick={() => toggleSort("firm")}
              active={sortKey === "firm"}
              dir={sortDir}
              className="sticky left-8 z-20 bg-surface min-w-[200px]"
            >
              Firm
            </Th>
            <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir} className="min-w-[180px]">
              Status
            </Th>
            <Th onClick={() => toggleSort("days_in_stage")} active={sortKey === "days_in_stage"} dir={sortDir}>
              Days
            </Th>
            <Th>Practice</Th>
            <Th>Loc.</Th>
            <Th onClick={() => toggleSort("coverage")} active={sortKey === "coverage"} dir={sortDir}>
              Cov.
            </Th>
            <Th>Package</Th>
            <Th onClick={() => toggleSort("quoted")} active={sortKey === "quoted"} dir={sortDir}>
              Quoted
            </Th>
            <Th>Contact</Th>
            <Th onClick={() => toggleSort("updated")} active={sortKey === "updated"} dir={sortDir}>
              Updated
            </Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((lead) => {
            const dis = daysSince(lead.status_changed_at);
            const stale = dis != null && dis >= 16;
            return (
              <tr
                key={lead.id}
                onClick={() => onOpenLead(lead)}
                className="cursor-pointer hover:bg-[var(--color-border)]/30 transition-colors"
              >
                <Td className="w-8 sticky left-0 bg-surface">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(lead.id, !lead.pinned);
                    }}
                    className={`text-base leading-none ${lead.pinned ? "text-brand" : "text-subtle hover:text-brand"}`}
                    aria-label={lead.pinned ? "unpin lead" : "pin lead"}
                    title={lead.pinned ? "Unpin" : "Pin"}
                  >
                    {lead.pinned ? "★" : "☆"}
                  </button>
                </Td>
                <Td className="sticky left-8 bg-surface font-medium text-heading">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[200px]">{leadDisplayName(lead)}</span>
                    {lead.firm_url && (
                      <span className="text-2xs text-subtle truncate max-w-[200px]">
                        {lead.firm_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </span>
                    )}
                  </div>
                </Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  <StatusDropdown
                    value={lead.status}
                    onChange={(next) => onStatusChange(lead.id, next)}
                    size="sm"
                  />
                </Td>
                <Td className={stale ? "text-[var(--color-danger)] font-medium" : "text-body"}>
                  {relativeDays(lead.status_changed_at)}
                  {stale && <span className="ml-1 text-[10px]">⚠</span>}
                </Td>
                <Td className="text-body capitalize">{lead.firm_practice_area || "—"}</Td>
                <Td className="text-body">{leadLocation(lead) || "—"}</Td>
                <Td className="text-body">
                  {lead.coverage_score != null ? `${lead.coverage_score}%` : "—"}
                </Td>
                <Td className="text-body capitalize">{lead.quoted_package ?? "—"}</Td>
                <Td className="text-body">{formatCents(lead.quoted_value_cents)}</Td>
                <Td className="text-body truncate max-w-[160px]">
                  {lead.decision_maker_name ?? lead.contact_name ?? "—"}
                </Td>
                <Td className="text-subtle text-2xs whitespace-nowrap">
                  {new Date(lead.status_changed_at).toLocaleDateString()}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface ThProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
  dir?: SortDir;
}

function Th({ children, className = "", onClick, active, dir }: ThProps) {
  const sortable = !!onClick;
  return (
    <th
      onClick={onClick}
      className={[
        "py-2 px-3 border-b border-[var(--color-border)] font-medium whitespace-nowrap",
        sortable ? "cursor-pointer select-none hover:text-heading" : "",
        active ? "text-brand" : "",
        className,
      ].join(" ")}
    >
      {children}
      {active && <span className="ml-1 text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}

interface TdProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

function Td({ children, className = "", onClick }: TdProps) {
  return (
    <td onClick={onClick} className={["py-2 px-3 border-b border-[var(--color-border)]/40 align-middle", className].join(" ")}>
      {children}
    </td>
  );
}
