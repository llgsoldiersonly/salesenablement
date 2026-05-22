import { useMemo } from "react";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_ORDER,
  groupLeadsByStatus,
  type LeadWithAssessment,
} from "../../lib/leads";
import { statusStyle } from "./StatusBadge";
import {
  daysSince,
  formatCents,
  leadDisplayName,
  leadLocation,
  relativeDays,
} from "./leadFormatters";

interface Props {
  leads: LeadWithAssessment[];
  onOpenLead: (lead: LeadWithAssessment) => void;
}

const PRIORITY_BORDER: Record<number, string> = {
  0: "border-l-[var(--color-border)]",
  1: "border-l-amber-400",
  2: "border-l-brand",
  3: "border-l-[var(--color-danger)]",
};

export function LeadsKanbanView({ leads, onOpenLead }: Props) {
  const grouped = useMemo(() => groupLeadsByStatus(leads), [leads]);

  const totalsByStatus = LEAD_STATUS_ORDER.map((s) => ({
    status: s,
    count: grouped[s].length,
    sum: grouped[s].reduce((acc, l) => acc + (l.quoted_value_cents ?? 0), 0),
  }));

  return (
    <div className="flex-1 overflow-x-auto scrollbar-thin">
      <div className="inline-flex gap-3 p-4 min-h-full">
        {LEAD_STATUS_ORDER.map((status) => {
          const lane = grouped[status];
          const totals = totalsByStatus.find((t) => t.status === status)!;
          const style = statusStyle(status);
          return (
            <div
              key={status}
              className="flex flex-col w-[260px] shrink-0 rounded-[10px] bg-[var(--color-border)]/20"
            >
              {/* Lane header */}
              <div className="sticky top-0 z-10 px-3 py-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2 bg-surface rounded-t-[10px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                  <span className="text-xs font-semibold text-heading uppercase tracking-wider truncate">
                    {LEAD_STATUS_LABEL[status]}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-2xs text-subtle">{totals.count}</span>
                  {totals.sum > 0 && (
                    <span className="text-2xs text-subtle">· {formatCents(totals.sum)}</span>
                  )}
                </div>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-2 min-h-[40px]">
                {lane.length === 0 && (
                  <div className="text-2xs text-subtle text-center py-6 italic">empty</div>
                )}
                {lane.map((lead) => {
                  const dis = daysSince(lead.status_changed_at);
                  const stale = dis != null && dis >= 16;
                  return (
                    <button
                      key={lead.id}
                      onClick={() => onOpenLead(lead)}
                      className={[
                        "text-left rounded-[8px] bg-surface shadow-xs hover:shadow-sm transition-all duration-150",
                        "border-l-[3px] border-y border-r border-[var(--color-border)]",
                        PRIORITY_BORDER[lead.priority] ?? PRIORITY_BORDER[0],
                        "p-2.5 flex flex-col gap-1",
                      ].join(" ")}
                    >
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="text-xs font-semibold text-heading truncate">
                          {lead.ready_for_closer && (
                            <span className="mr-1" title="Ready for closer pickup">🚩</span>
                          )}
                          {lead.pinned && <span className="text-brand mr-0.5">★</span>}
                          {leadDisplayName(lead)}
                        </span>
                        {lead.coverage_score != null && (
                          <span className="text-2xs text-subtle shrink-0">
                            {lead.coverage_score}%
                          </span>
                        )}
                      </div>

                      {/* Meta row */}
                      <div className="text-2xs text-subtle truncate">
                        {[leadLocation(lead), lead.firm_practice_area].filter(Boolean).join(" · ")}
                      </div>

                      {/* Quoted */}
                      {(lead.quoted_value_cents != null || lead.quoted_package) && (
                        <div className="text-2xs text-body truncate">
                          {lead.quoted_package && (
                            <span className="capitalize">{lead.quoted_package}</span>
                          )}
                          {lead.quoted_value_cents != null && (
                            <span className="ml-1">· {formatCents(lead.quoted_value_cents)}</span>
                          )}
                        </div>
                      )}

                      {/* Footer: days in stage + contact */}
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span
                          className={[
                            "text-[10px]",
                            stale ? "text-[var(--color-danger)] font-medium" : "text-subtle",
                          ].join(" ")}
                        >
                          {relativeDays(lead.status_changed_at)}
                          {stale && " ⚠"}
                        </span>
                        <span className="text-[10px] text-subtle truncate max-w-[140px]">
                          {lead.decision_maker_name ?? lead.contact_name ?? "—"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
