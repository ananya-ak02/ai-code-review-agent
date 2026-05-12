import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import type { ReviewHistoryRecord, ReviewResult, ToolResult } from "./types";

const webSocketTransport = WebSocket as unknown as typeof globalThis.WebSocket;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }
  return url;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return key;
}

export function createSupabaseAdmin() {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { persistSession: false },
    realtime: { transport: webSocketTransport }
  });
}

export async function saveReview(review: ReviewResult): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("reviews").insert({
    code_hash: review.codeHash,
    language: review.language,
    overall_score: review.overallScore,
    issues_count: review.issuesCount,
    tool_results: review.toolResults
  });

  if (error) {
    throw new Error(`Failed to save review: ${error.message}`);
  }
}

export async function getReviewHistory(limit = 50): Promise<ReviewHistoryRecord[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, code_hash, language, overall_score, issues_count, tool_results, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to read review history: ${error.message}`);
  }

  return (data ?? []).map((record) => ({
    ...record,
    tool_results: record.tool_results as ToolResult[]
  }));
}
