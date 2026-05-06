/**
 * /api/ask streaming handler.
 *
 * Accepts POST { question: string, context: AskContext }.
 * Streams NDJSON events:
 *   {"type":"text","data":"..."}
 *   {"type":"done"}
 *   {"type":"error","message":"..."}
 */

import Anthropic from "@anthropic-ai/sdk";
import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyAuth, unauthorizedResponse } from "./verifyAuth.js";

export interface AskContext {
  firmName: string;
  firmCity: string;
  firmState: string;
  practiceArea: string;
  coverageScore: number;
  concerns: string[];
  recommendedPackage: string;
  competitors: string[];
}

interface AskRequestBody {
  question: string;
  context: AskContext;
}

async function readJsonBody(req: IncomingMessage): Promise<AskRequestBody> {
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

function buildSystemPrompt(ctx: AskContext): string {
  const competitorList =
    ctx.competitors.length > 0
      ? ctx.competitors.map((c, i) => `  ${i + 1}. ${c}`).join("\n")
      : "  None identified";

  const concernList =
    ctx.concerns.length > 0
      ? ctx.concerns.map((c) => `  - ${c}`).join("\n")
      : "  None";

  return `You are a real-time sales coach embedded in a legal marketing sales tool. A closer is on or preparing for a sales call right now and needs fast, actionable answers.

CURRENT LEAD:
  Firm: ${ctx.firmName}
  Location: ${ctx.firmCity}, ${ctx.firmState}
  Practice area: ${ctx.practiceArea}
  Digital coverage score: ${ctx.coverageScore}/100 (lower = more gaps = stronger urgency pitch)
  Recommended package: ${ctx.recommendedPackage}

Key concerns about this firm:
${concernList}

Top competitors in their market:
${competitorList}

RESPONSE RULES:
- Be extremely concise — the closer is mid-call and can't read a wall of text
- Lead with the most actionable answer in 1–2 sentences, then add supporting bullets if needed
- Use plain, conversational language (no jargon the closer has to decode)
- Frame everything around closing: what should the closer SAY or DO right now?
- If the question is about an objection, give a specific rebuttal script they can use word-for-word
- Never say "I cannot" — if you don't know something specific, give the best general tactic
- Maximum response length: ~150 words unless the question clearly needs more`;
}

export async function handleAsk(
  req: IncomingMessage,
  res: ServerResponse,
  preParsedBody?: AskRequestBody,
): Promise<void> {
  const userId = await verifyAuth(req);
  if (!userId) {
    unauthorizedResponse(res, true);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/x-ndjson");
    writeEvent(res, { type: "error", message: "ANTHROPIC_API_KEY not configured on server." });
    res.end();
    return;
  }

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  let body: AskRequestBody;
  try {
    body = preParsedBody ?? (await readJsonBody(req));
  } catch {
    writeEvent(res, { type: "error", message: "Invalid JSON body." });
    res.end();
    return;
  }

  const { question, context } = body;
  if (!question?.trim()) {
    writeEvent(res, { type: "error", message: "question is required." });
    res.end();
    return;
  }

  const client = new Anthropic({ apiKey });

  try {
    const stream = client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: buildSystemPrompt(context),
      messages: [{ role: "user", content: question.trim() }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        writeEvent(res, { type: "text", data: event.delta.text });
      }
    }

    writeEvent(res, { type: "done" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    writeEvent(res, { type: "error", message: msg });
  } finally {
    res.end();
  }
}
