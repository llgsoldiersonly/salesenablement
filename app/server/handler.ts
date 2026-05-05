/**
 * /api/brief streaming handler.
 *
 * Accepts POST { report: ProbeReport, recommendation: PackageRecommendation }.
 * Streams NDJSON events to the client:
 *   {"type":"text","data":"..."}    — token/chunk delta
 *   {"type":"usage","input":N,"output":N,"cache_read":N,"cache_write":N}
 *   {"type":"done"}
 *   {"type":"error","message":"..."}
 *
 * Lives behind Vite's configureServer in dev. For production, point this at
 * a Cloudflare Worker / Lambda / Express endpoint that mounts handleBrief().
 *
 * NEVER ship the API key to the client — this handler reads ANTHROPIC_API_KEY
 * from process.env so the secret stays server-side.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";
import type { PackageRecommendation, ProbeReport } from "../src/types/index.js";

interface BriefRequestBody {
  report: ProbeReport;
  recommendation: PackageRecommendation;
}

async function readJsonBody(req: IncomingMessage): Promise<BriefRequestBody> {
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

export async function handleBrief(
  req: IncomingMessage,
  res: ServerResponse,
  preParsedBody?: BriefRequestBody,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/x-ndjson");
    writeEvent(res, { type: "error", message: "ANTHROPIC_API_KEY not configured on server." });
    res.end();
    return;
  }

  let body: BriefRequestBody;
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

  if (!body.report || !body.recommendation) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/x-ndjson");
    writeEvent(res, {
      type: "error",
      message: "Missing 'report' or 'recommendation' in request body.",
    });
    res.end();
    return;
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(body.report, body.recommendation);

  // Defensive guard — empty text blocks with cache_control attached return a
  // 400 from Anthropic. Both should always be non-empty given our builders,
  // but assert anyway so we never ship the bug we just fixed.
  if (systemPrompt.trim() === "" || userPrompt.trim() === "") {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/x-ndjson");
    writeEvent(res, {
      type: "error",
      message: "Internal error: empty prompt would trigger cache_control 400.",
    });
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no"); // disable proxy buffering

  const client = new Anthropic({ apiKey });

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: [
        { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        { role: "user", content: [{ type: "text", text: userPrompt }] },
      ],
    });

    stream.on("text", (delta) => {
      writeEvent(res, { type: "text", data: delta });
    });

    const final = await stream.finalMessage();
    if (final.usage) {
      writeEvent(res, {
        type: "usage",
        input: final.usage.input_tokens,
        output: final.usage.output_tokens,
        cache_read: final.usage.cache_read_input_tokens ?? 0,
        cache_write: final.usage.cache_creation_input_tokens ?? 0,
      });
    }
    writeEvent(res, { type: "done" });
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    writeEvent(res, { type: "error", message: msg });
    res.end();
  }
}
