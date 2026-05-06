import type { AskContext } from "../../server/ask-handler";

export type AskEvent =
  | { type: "text"; data: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface AskHandle {
  events: AsyncGenerator<AskEvent, void, void>;
  abort: () => void;
}

export function streamAsk(question: string, context: AskContext): AskHandle {
  const controller = new AbortController();

  async function* iter(): AsyncGenerator<AskEvent, void, void> {
    let res: Response;
    try {
      res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      yield { type: "error", message: err instanceof Error ? err.message : String(err) };
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

        let nl = buffer.indexOf("\n");
        while (nl !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) {
            try {
              yield JSON.parse(line) as AskEvent;
            } catch {
              yield { type: "error", message: `Bad NDJSON: ${line.slice(0, 200)}` };
              return;
            }
          }
          nl = buffer.indexOf("\n");
        }
      }
      const tail = buffer.trim();
      if (tail) {
        try { yield JSON.parse(tail) as AskEvent; } catch { /* ignore */ }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      yield { type: "error", message: err instanceof Error ? err.message : String(err) };
    }
  }

  return { events: iter(), abort: () => controller.abort() };
}
