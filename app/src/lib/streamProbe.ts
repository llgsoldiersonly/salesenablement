import type { FirmInput, ProbeReport } from "../types";

/**
 * Streams a probe run from /api/probe (NDJSON over fetch). Yields:
 *   { type: "step", source, status: "running" | "ok" | "partial" | "failed" | "skipped", durationMs?, notes?, error? }
 *   { type: "report", report: ProbeReport }
 *   { type: "done" }
 *   { type: "error", message }
 *
 * Cancel via the returned controller's abort().
 */

export type ProbeSource = "site-scrape" | "google-places" | "serp-local";

export type ProbeStreamEvent =
  | {
      type: "step";
      source: ProbeSource;
      status: "running" | "ok" | "partial" | "failed" | "skipped";
      durationMs?: number;
      notes?: string[];
      error?: string;
    }
  | { type: "report"; report: ProbeReport }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ProbeStreamHandle {
  events: AsyncGenerator<ProbeStreamEvent, void, void>;
  abort: () => void;
}

export function streamProbe(firm: FirmInput): ProbeStreamHandle {
  const controller = new AbortController();

  async function* iter(): AsyncGenerator<ProbeStreamEvent, void, void> {
    let res: Response;
    try {
      res = await fetch("/api/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firm }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      yield { type: "error", message: errMsg(err) };
      return;
    }

    if (!res.ok || !res.body) {
      yield {
        type: "error",
        message: `HTTP ${res.status}: ${await res.text().catch(() => "")}`,
      };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl = buffer.indexOf("\n");
        while (nl !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) {
            try {
              yield JSON.parse(line) as ProbeStreamEvent;
            } catch {
              yield { type: "error", message: `Bad NDJSON line: ${line.slice(0, 200)}` };
              return;
            }
          }
          nl = buffer.indexOf("\n");
        }
      }
      const tail = buffer.trim();
      if (tail) {
        try {
          yield JSON.parse(tail) as ProbeStreamEvent;
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      yield { type: "error", message: errMsg(err) };
    }
  }

  return { events: iter(), abort: () => controller.abort() };
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
