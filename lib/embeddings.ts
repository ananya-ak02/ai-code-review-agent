import { InferenceClient } from "@huggingface/inference";

const MAX_EMBED_CHARS = 700;

type HuggingFaceEmbeddingResponse = number[] | number[][] | number[][][];

function meanPool(tokens: number[][]): number[] {
  if (tokens.length === 0) {
    return Array.from({ length: 768 }, () => 0);
  }

  const width = tokens[0]?.length ?? 768;
  const pooled = Array.from({ length: width }, () => 0);

  for (const token of tokens) {
    for (let index = 0; index < width; index += 1) {
      pooled[index] += token[index] ?? 0;
    }
  }

  return pooled.map((value) => value / tokens.length);
}

function normalizeEmbedding(response: HuggingFaceEmbeddingResponse): number[] {
  if (Array.isArray(response) && typeof response[0] === "number") {
    return response as number[];
  }

  if (
    Array.isArray(response) &&
    Array.isArray(response[0]) &&
    typeof (response[0] as number[])[0] === "number"
  ) {
    return meanPool(response as number[][]);
  }

  if (
    Array.isArray(response) &&
    Array.isArray(response[0]) &&
    Array.isArray((response[0] as number[][])[0])
  ) {
    return meanPool((response as number[][][])[0] ?? []);
  }

  throw new Error("Hugging Face returned an embedding shape this app does not recognize.");
}

export async function embedText(input: string): Promise<number[]> {
  const apiKey = process.env.HUGGING_FACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGING_FACE_API_KEY is not configured.");
  }

  // Keep inputs under CodeBERT's 512-token limit; approximate with chars.
  const trimmed = input.length > MAX_EMBED_CHARS ? input.slice(0, MAX_EMBED_CHARS) : input;
  const client = new InferenceClient(apiKey);
  const json = (await client.featureExtraction({
    model: "microsoft/codebert-base",
    inputs: trimmed,
    provider: "hf-inference"
  })) as HuggingFaceEmbeddingResponse;
  const embedding = normalizeEmbedding(json);

  if (embedding.length !== 768) {
    throw new Error(`CodeBERT embedding must be 768 dimensions, received ${embedding.length}.`);
  }

  return embedding;
}
