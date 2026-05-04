import { isProbeReport } from "./storage";
import type { ProbeReport } from "../types";

/**
 * Encodes a probe report into a URL-safe string for hash-based sharing.
 *
 * Uses CompressionStream (gzip) when available — typical reports compress
 * 5–8x. Falls back to plain base64url with a "u:" prefix on older browsers.
 *
 * The encoded payload goes in `window.location.hash`, which the browser
 * never sends to the server. So sharing a link doesn't expose the firm's
 * data to whoever hosts this app.
 */
export async function encodeShare(report: ProbeReport): Promise<string> {
  const json = JSON.stringify(report);
  const bytes = new TextEncoder().encode(json);

  if (typeof CompressionStream !== "undefined") {
    const stream = new Response(bytes as BodyInit).body!.pipeThrough(
      new CompressionStream("gzip")
    );
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    return base64UrlEncode(compressed);
  }

  return "u:" + base64UrlEncode(bytes);
}

export async function decodeShare(s: string): Promise<ProbeReport | null> {
  try {
    let bytes: Uint8Array;
    if (s.startsWith("u:")) {
      bytes = base64UrlDecode(s.slice(2));
    } else if (typeof DecompressionStream !== "undefined") {
      const compressed = base64UrlDecode(s);
      const stream = new Response(compressed as BodyInit).body!.pipeThrough(
        new DecompressionStream("gzip")
      );
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      return null;
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    return isProbeReport(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Build the full share URL for the current page + encoded payload. */
export function buildShareUrl(encoded: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#data=${encoded}`;
}

/** Read the report from the current URL hash if any, return null otherwise. */
export async function readReportFromHash(): Promise<ProbeReport | null> {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  const match = hash.match(/^#data=(.+)$/);
  if (!match) return null;
  return decodeShare(match[1]);
}

/** Clear the hash without scrolling/reloading. */
export function clearHash(): void {
  if (typeof window === "undefined") return;
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

/* ── base64url helpers ──────────────────────────────────────────────────── */

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
