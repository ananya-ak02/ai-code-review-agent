import { Redis } from "@upstash/redis";
import type { ReviewResult } from "./types";

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 14;

let redis: Redis | null = null;

function getRedis(): Redis {
  if (redis) {
    return redis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured.");
  }

  redis = new Redis({ url, token });
  return redis;
}

function cacheKey(codeHash: string): string {
  return `review:${codeHash}`;
}

export async function getCachedReview(codeHash: string): Promise<ReviewResult | null> {
  const cached = await getRedis().get<ReviewResult>(cacheKey(codeHash));
  return cached ? { ...cached, cached: true } : null;
}

export async function setCachedReview(review: ReviewResult): Promise<void> {
  await getRedis().set(cacheKey(review.codeHash), { ...review, cached: false }, { ex: CACHE_TTL_SECONDS });
}
