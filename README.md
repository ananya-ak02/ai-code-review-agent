# AI-Powered Code Review Agent

A production-grade Next.js workstation for deep AI code review. Engineers can paste code or fetch a public GitHub file, then stream a multi-tool LangChain review across bugs, security, complexity, style, and performance. The system uses Groq for fast LLM calls, Hugging Face CodeBERT embeddings, Supabase pgvector for best-practice retrieval, Upstash Redis for cache hits, and Supabase PostgreSQL for history and improvement tracking.

## Architecture

```text
User
  |
  v
Next.js 14 App Router UI
  |  \
  |   \-- GitHub Contents API
  |
  v
/api/review SSE endpoint
  |
  +--> SHA-256 code hash
  |      |
  |      v
  |    Upstash Redis cache
  |      |-- HIT --> streamed cached ReviewResult
  |      |
  |      '-- MISS
  |
  +--> Hugging Face CodeBERT embeddings
  |      |
  |      v
  |    Supabase pgvector best_practices
  |      |
  |      v
  |    Top 5 relevant rules
  |
  v
LangChain Agent
  |
  +--> bugDetector
  +--> securityScanner
  +--> complexityAnalyzer
  +--> styleChecker
  +--> performanceAuditor
  |
  v
Groq llama-3.3-70b-versatile
  |
  v
Structured tool JSON + streamed final synthesis
  |
  +--> Supabase reviews table
  '--> Redis cached ReviewResult
```

## Features

- Paste mode with Monaco Editor and language auto-detection.
- GitHub mode for public `owner/repo/path` file loading through the GitHub Contents API.
- Five specialist LangChain tools running concurrently and returning structured JSON.
- RAG grounding through CodeBERT embeddings and Supabase pgvector similarity search.
- Server-Sent Events over a POST response for live tool completion and token streaming.
- Redis cache keyed by SHA-256 code hash with `X-Review-Cache: HIT` or `MISS`.
- Custom diff renderer with original and suggested snippets.
- Review history dashboard with score trend, issue breakdown, language donut, and compare view.
- Dark dev-tool UI using Inter, JetBrains Mono, terminal green, amber warnings, and critical red.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Supabase project

Create a Supabase project, then run the migration:

```bash
supabase db push
```

The migration enables `pgvector`, creates `reviews` and `best_practices`, adds indexes, enables RLS, and defines the `match_best_practices` RPC used by the RAG pipeline.

### 3. Configure Groq

Create a Groq API key and set:

```bash
GROQ_API_KEY=your-groq-api-key
```

The app uses:

```text
llama-3.3-70b-versatile
```

### 4. Configure Hugging Face

Create a Hugging Face access token with inference permissions and set:

```bash
HUGGING_FACE_API_KEY=your-hugging-face-token
```

Embeddings are generated with:

```text
microsoft/codebert-base
```

### 5. Configure Upstash Redis

Create an Upstash Redis database and set the REST credentials:

```bash
UPSTASH_REDIS_REST_URL=https://your-upstash-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token
```

### 6. Configure local environment

Copy the example file and fill in real values:

```bash
cp .env.local.example .env.local
```

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GROQ_API_KEY=your-groq-api-key
HUGGING_FACE_API_KEY=your-hugging-face-token
UPSTASH_REDIS_REST_URL=https://your-upstash-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token
```

### 7. Seed best practices

After the migration is applied and `.env.local` is configured, run:

```bash
npm run seed
```

The seed script embeds and inserts a curated set of rules covering SOLID, OWASP, clean code, reliability, performance, TypeScript, API design, observability, and testing.

### 8. Run the app

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Example Review Output

The review screen is split into a 60% Monaco editor and a 40% streaming console. As the agent runs, the telemetry panel updates each tool from queued to running to complete:

```text
[✓] Bug Detector        3 issues
[✓] Security Scanner   2 issues
[✓] Complexity Analyzer 1 issue
[✓] Style Checker      4 issues
[✓] Performance Auditor 2 issues
```

The final result shows an animated score ring, a cached badge when Redis returns a hit, expandable tool cards, severity pills, line-specific findings, and a custom red/green diff for every suggested fix. The dashboard turns saved reviews into score history, issue-type distribution, language mix, and score deltas between any two previous reviews.

## API Routes

- `POST /api/review` streams review progress and final result as SSE events.
- `GET /api/github?owner=vercel&repo=next.js&path=packages/next/src/server/web/spec-extension/request.ts` fetches a public file.
- `GET /api/history?limit=50` returns saved reviews.
- `GET /api/health` checks required environment configuration.

## Production Notes

- The service role key is used only in server routes and scripts.
- Redis stores complete review JSON for repeated code hashes.
- Supabase stores durable review history and best-practice vectors.
- The GitHub route is unauthenticated and intended for public repositories.
- LLM outputs are parsed and validated with Zod before reaching the UI.
- The app is ready for Vercel deployment once environment variables are configured.
