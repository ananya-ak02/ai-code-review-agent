import { NextRequest } from "next/server";
import { runCodeReviewAgent } from "@/lib/agent";
import { getCachedReview, setCachedReview } from "@/lib/redis";
import { saveReview } from "@/lib/supabase";
import { hashCode } from "@/lib/hash";
import type { AgentProgressEvent, ReviewResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewRequestBody = {
  code?: string;
  language?: string;
};

function sse(event: AgentProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: ReviewRequestBody;

  try {
    body = (await request.json()) as ReviewRequestBody;
  } catch {
    return jsonError("Request body must be valid JSON.");
  }

  const code = body.code?.trimEnd() ?? "";
  const language = body.language?.trim() || "typescript";

  if (!code.trim()) {
    return jsonError("Code is required.");
  }

  const codeHash = await hashCode(code);
  const cached = await getCachedReview(codeHash);

  if (cached) {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            sse({
              type: "complete",
              review: { ...cached, cached: true, createdAt: new Date().toISOString() }
            })
          )
        );
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Review-Cache": "HIT"
      }
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentProgressEvent) => {
        controller.enqueue(encoder.encode(sse(event)));
      };

      try {
        const review: ReviewResult = await runCodeReviewAgent(code, language, (event) => send(event));
        await Promise.all([setCachedReview(review), saveReview(review)]);
        send({ type: "complete", review });
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Review failed.";
        send({ type: "error", message });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Review-Cache": "MISS"
    }
  });
}
