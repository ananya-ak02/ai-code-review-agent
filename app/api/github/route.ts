import { NextRequest } from "next/server";
import { fetchGitHubFile } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner") ?? "";
  const repo = searchParams.get("repo") ?? "";
  const path = searchParams.get("path") ?? "";
  const ref = searchParams.get("ref") ?? undefined;

  try {
    const file = await fetchGitHubFile({ owner, repo, path, ref });
    return Response.json(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch GitHub file.";
    return Response.json({ error: message }, { status: 400 });
  }
}
