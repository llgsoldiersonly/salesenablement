import { useCallback, useEffect, useState } from "react";
import {
  connectRingCentral,
  disconnectRingCentral,
  getRcStatus,
  type RcStatus,
} from "../lib/ringcentral";

/**
 * Compact RingCentral connection control, suitable for the user menu.
 *
 * - Shows "Connect RingCentral" if not connected.
 * - Shows "RC: <number>  ·  Disconnect" if connected.
 * - Surfaces ?rc=connected / ?rc=error redirect flags from the OAuth callback
 *   for ~5 seconds, then strips them from the URL.
 */
export function RingCentralConnect() {
  const [status, setStatus] = useState<RcStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await getRcStatus());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Pick up the post-OAuth redirect flag once
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("rc");
    const err = params.get("err");
    if (!flag) return;
    if (flag === "connected") setBanner("✓ RingCentral connected.");
    else setBanner(`RingCentral error: ${err ?? "unknown"}`);
    params.delete("rc");
    params.delete("err");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    setTimeout(() => setBanner(null), 6000);
    void refresh();
  }, [refresh]);

  const onConnect = async () => {
    setBusy(true);
    try {
      await connectRingCentral();
      // Browser navigates away to RC; no further code after this in practice
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Connect failed");
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    if (!confirm("Disconnect RingCentral from this app?")) return;
    setBusy(true);
    await disconnectRingCentral();
    await refresh();
    setBusy(false);
  };

  if (!status) return null;
  if (!status.configured) {
    return (
      <div className="text-2xs text-body-subtle italic">
        RingCentral env vars not configured on the server.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {banner && (
        <p
          className={[
            "text-2xs px-2 py-1 rounded-[6px]",
            banner.startsWith("✓") ? "bg-success-soft text-fg-success-strong" : "bg-danger-soft text-fg-danger-strong",
          ].join(" ")}
        >
          {banner}
        </p>
      )}
      {status.connected ? (
        <>
          <p className="text-2xs text-body-subtle">
            RingCentral connected
            {status.rcMainNumber && <span className="ml-1 text-body">· {status.rcMainNumber}</span>}
          </p>
          <button
            type="button"
            onClick={() => void onDisconnect()}
            disabled={busy}
            className="text-xs text-body-subtle hover:text-fg-danger text-left disabled:opacity-50"
          >
            Disconnect RingCentral
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void onConnect()}
          disabled={busy}
          className="text-xs font-medium text-fg-brand hover:underline text-left disabled:opacity-50"
        >
          {busy ? "Opening RingCentral…" : "Connect RingCentral"}
        </button>
      )}
    </div>
  );
}
