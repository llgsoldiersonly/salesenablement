import type { PackageRecommendation, ProbeReport } from "../types";

/**
 * Streams a brief from /api/brief (NDJSON over fetch). Returns an async
 * iterable of structured events the caller can switch on.
 *
 * Cancel by calling the returned controller's abort().
 */
export type BriefEvent =
  | { type: "text"; data: string }
  | { type: "usage"; input: number; output: number; cache_read: number; cache_write: number }
  | { type: "done" }
  | { type: "error"; message: string };

export interface StreamHandle {
  events: AsyncGenerator<BriefEvent, void, void>;
  abort: () => void;
}

export function streamBrief(
  report: ProbeReport,
  recommendation: PackageRecommendation
): StreamHandle {
  const controller = new AbortController();

  async function* iter(): AsyncGenerator<BriefEvent, void, void> {
    let res: Response;
    try {
      res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, recommendation }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      yield { type: "error", message: networkErrorMessage(err) };
      return;
    }

    if (!res.ok || !res.body) {
      yield { type: "error", message: `HTTP ${res.status}: ${await res.text().catch(() => "")}` };
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

        // NDJSON: split on \n, last segment may be partial.
        let nl = buffer.indexOf("\n");
        while (nl !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) {
            try {
              yield JSON.parse(line) as BriefEvent;
            } catch {
              yield { type: "error", message: `Bad NDJSON line: ${line.slice(0, 200)}` };
              return;
            }
          }
          nl = buffer.indexOf("\n");
        }
      }
      // Flush any trailing line without a newline (rare).
      const tail = buffer.trim();
      if (tail) {
        try {
          yield JSON.parse(tail) as BriefEvent;
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      yield { type: "error", message: networkErrorMessage(err) };
    }
  }

  return { events: iter(), abort: () => controller.abort() };
}

function networkErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
