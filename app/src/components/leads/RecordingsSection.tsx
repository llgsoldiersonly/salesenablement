import { useCallback, useEffect, useState } from "react";
import { listLeadRecordings, type LeadRecording } from "../../lib/leads";
import { refreshRecordingsForLead, recordingStreamUrl } from "../../lib/ringcentral";

interface Props {
  leadId: string;
  assessmentId: string;
  contactPhone: string | null;
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RecordingsSection({ leadId, assessmentId, contactPhone }: Props) {
  const [recordings, setRecordings] = useState<LeadRecording[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setRecordings(await listLeadRecordings(leadId));
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    if (!contactPhone) {
      setMsg({ kind: "err", text: "Add a contact phone first." });
      return;
    }
    setRefreshing(true);
    setMsg(null);
    const result = await refreshRecordingsForLead(leadId, assessmentId, contactPhone);
    setRefreshing(false);
    if (!result.ok) {
      setMsg({ kind: "err", text: result.hint ?? result.error ?? "Refresh failed" });
      return;
    }
    setMsg({
      kind: "ok",
      text:
        result.added === 0
          ? "No new recordings in the last 30 days."
          : `Added ${result.added} recording${result.added === 1 ? "" : "s"}.`,
    });
    await load();
    setTimeout(() => setMsg(null), 5000);
  };

  return (
    <section className="px-5 py-4 border-b border-[var(--color-border-default)] last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-2xs uppercase tracking-wider text-body-subtle font-semibold">
          Recordings
        </h3>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing || !contactPhone}
          className="text-2xs text-fg-brand hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
          title={contactPhone ? "Pull last 30 days from RingCentral" : "Add a contact phone first"}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {msg && (
        <div
          className={[
            "text-2xs px-2 py-1 rounded-[6px] mb-2",
            msg.kind === "ok"
              ? "bg-success-soft text-fg-success-strong"
              : "bg-danger-soft text-fg-danger-strong",
          ].join(" ")}
        >
          {msg.text}
        </div>
      )}
      {recordings === null ? (
        <p className="text-sm text-body-subtle italic">Loading…</p>
      ) : recordings.length === 0 ? (
        <p className="text-sm text-body-subtle italic">
          No recordings yet. Click Refresh to pull recent calls from RingCentral.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recordings.map((r) => (
            <li
              key={r.id}
              className="rounded-[8px] border border-[var(--color-border-default)] bg-neutral-secondary-soft p-2.5"
            >
              <div className="flex items-center justify-between gap-2 text-2xs text-body-subtle mb-1">
                <span>
                  {r.call_direction === "Inbound" ? "📥" : "📤"} {fmtDate(r.call_started_at)}
                </span>
                <span>{fmtDuration(r.duration_seconds)}</span>
              </div>
              {r.recording_uri && (
                <audio
                  controls
                  preload="none"
                  src={recordingStreamUrl(r.id)}
                  className="w-full h-8"
                />
              )}
              {r.transcript_text && (
                <details className="mt-1.5">
                  <summary className="text-2xs text-fg-brand cursor-pointer">
                    Transcript
                  </summary>
                  <p className="text-2xs text-body mt-1 whitespace-pre-wrap">
                    {r.transcript_text}
                  </p>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
