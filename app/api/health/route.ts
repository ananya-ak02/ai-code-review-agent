export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checks = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROQ_API_KEY",
  "HUGGING_FACE_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN"
] as const;

export async function GET(): Promise<Response> {
  const env = checks.map((name) => ({
    name,
    configured: Boolean(process.env[name])
  }));
  const healthy = env.every((check) => check.configured);

  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "ai-code-review-agent",
      timestamp: new Date().toISOString(),
      env
    },
    { status: healthy ? 200 : 503 }
  );
}
