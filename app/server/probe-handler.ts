/**
 * /api/probe streaming handler.
 *
 * POST { firm: FirmInput } → NDJSON stream of:
 *   {"type":"step","source":"site-scrape","status":"running"}
 *   {"type":"step","source":"site-scrape","status":"ok","durationMs":1234}
 *   {"type":"report","report":<ProbeReport>}
 *   {"type":"done"}
 *   {"type":"error","message":"..."}
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { runProbe } from "./probe/run.js";
import type { FirmInput } from "../src/types/index.js";

interface ProbeRequestBody {
  firm: FirmInput;
}

async function readJsonBody(req: IncomingMessage): Promise<ProbeRequestBody> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function writeEvent(res: ServerResponse, event: object): void {
  res.write(JSON.stringify(event) + "\n");
}

function isFirmInput(value: unknown): value is FirmInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.url === "string" &&
    typeof v.city === "string" &&
    typeof v.state === "string" &&
    typeof v.practiceArea === "string"
  );
}

export async function handleProbe(
  req: IncomingMessage,
  res: ServerResponse,
  preParsedBody?: ProbeRequestBody,
): Promise<void> {
  let body: ProbeRequestBody;
  if (preParsedBody) {
    body = preParsedBody;
  } else {
    try {
      body = await readJsonBody(req);
    } catch (e) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/x-ndjson");
      writeEvent(res, {
        type: "error",
        message: `Invalid JSON body: ${e instanceof Error ? e.message : String(e)}`,
      });
      res.end();
      return;
    }
  }

  if (!isFirmInput(body.firm)) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/x-ndjson");
    writeEvent(res, {
      type: "error",
      message: "Missing or malformed 'firm' in request body. Required: name, url, city, state, practiceArea.",
    });
    res.end();
    return;
  }

  // Trim whitespace and reject obvious empties
  const firm: FirmInput = {
    name: body.firm.name.trim(),
    url: body.firm.url.trim(),
    city: body.firm.city.trim(),
    state: body.firm.state.trim(),
    practiceArea: body.firm.practiceArea.trim(),
  };
  if (!firm.name || !firm.url || !firm.city || !firm.state || !firm.practiceArea) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/x-ndjson");
    writeEvent(res, {
      type: "error",
      message: "All firm fields are required and must be non-empty.",
    });
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    for await (const event of runProbe(firm)) {
      writeEvent(res, event);
    }
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    writeEvent(res, { type: "error", message: msg });
    res.end();
  }
}
