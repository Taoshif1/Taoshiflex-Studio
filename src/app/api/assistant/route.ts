import { NextRequest } from "next/server";

import { generateStudioAssistantReply } from "@/lib/gemini-studio-assistant";
import { publicRateLimit } from "@/lib/public-rate-limit";
import { readJson } from "@/lib/request-body";
import { isSameOrigin } from "@/lib/admin-security";
import {
  fallbackStudioAssistantReply,
} from "@/lib/studio-assistant-fallback";
import { parseAssistantRequest } from "@/lib/studio-assistant-contract";
import { getPublicStudioAssistantContext } from "@/lib/studio-assistant-knowledge";

const MAX_REQUEST_BYTES = 12_000;
const headers = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return Response.json({error:"Cross-origin request rejected."},{status:403});
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) {
    return Response.json({ error: "That message is too large." }, { status: 413, headers });
  }
  if (
    !await publicRateLimit(request,"assistant-minute",8,60) ||
    !await publicRateLimit(request,"assistant-hour",40,3600)
  ) {
    return Response.json(
      {
        reply: "The Studio Assistant has reached its public request limit. Please try again later, or use Start a Project for a real scope review.",
        source: "limit",
      },
      { status: 429, headers },
    );
  }

  const body = await readJson(request);
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
          reply: fallbackStudioAssistantReply({
            ...input,
            ...context,
            providerUnavailable: true,
          }),
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
