import type { BestPracticeMatch } from "./types";
import { embedText } from "./embeddings";
import { createSupabaseAdmin } from "./supabase";

function toPgVector(values: number[]): string {
  return `[${values.map((value) => Number(value.toFixed(8))).join(",")}]`;
}

export async function getRelevantBestPractices(code: string, limit = 5): Promise<BestPracticeMatch[]> {
  const embedding = await embedText(code);
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase.rpc("match_best_practices", {
    query_embedding: toPgVector(embedding),
    match_count: limit
  });

  if (error) {
    throw new Error(`Best-practice similarity search failed: ${error.message}`);
  }

  return (data ?? []) as BestPracticeMatch[];
}
