import { NextRequest } from "next/server";

import { generateStudioAssistantReply } from "@/lib/gemini-studio-assistant";
import { rateLimit } from "@/lib/rate-limit";
import {
  fallbackStudioAssistantReply,
  parseAssistantRequest,
} from "@/lib/studio-assistant-fallback";
import { getPublicStudioAssistantContext } from "@/lib/studio-assistant-knowledge";

const MAX_REQUEST_BYTES = 12_000;
const headers = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) {
    return Response.json({ error: "That message is too large." }, { status: 413, headers });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (
    !rateLimit(`assistant-minute:${ip}`, 8, 60_000) ||
    !rateLimit(`assistant-hour:${ip}`, 40, 60 * 60_000)
  ) {
    return Response.json(
      {
        reply: "The Studio Assistant has reached its public request limit. Please try again later, or use Start a Project for a real scope review.",
        source: "limit",
      },
      { status: 429, headers },
    );
  }

  const rawBody = await request.text().catch(() => "");
  if (!rawBody || rawBody.length > MAX_REQUEST_BYTES) {
    return Response.json({ error: "That message is too large." }, { status: 413, headers });
  }
  let body: unknown = null;
  try { body = JSON.parse(rawBody); } catch { /* handled by request validation */ }
  const input = parseAssistantRequest(body);
  if (!input) {
    return Response.json(
      { error: "Please send a shorter question with a limited recent conversation." },
      { status: 400, headers },
    );
  }

  try {
    const context = await getPublicStudioAssistantContext();
    if (!context.settings.enabled) {
      return Response.json({ error: "The Studio Assistant is unavailable." }, { status: 404, headers });
    }
    try {
      const reply = await generateStudioAssistantReply({ ...input, ...context });
      return Response.json({ reply, source: "gemini" }, { headers });
    } catch {
      return Response.json(
        {
          reply: fallbackStudioAssistantReply(
            input.question,
            context.settings,
            context.packages,
            true,
          ),
          source: "fallback",
        },
        { headers },
      );
    }
  } catch {
    return Response.json(
      { error: "Studio guidance is temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
