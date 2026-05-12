import { NextRequest } from "next/server";
import { getReviewHistory } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;

  try {
    const history = await getReviewHistory(limit);
    return Response.json({ history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load review history.";
    return Response.json({ error: message }, { status: 500 });
  }
}
