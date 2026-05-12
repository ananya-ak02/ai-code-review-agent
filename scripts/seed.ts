import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { embedText } from "../lib/embeddings";

config({ path: ".env.local" });
config();

const webSocketTransport = WebSocket as unknown as typeof globalThis.WebSocket;

type PracticeRule = {
  category: string;
  rule_text: string;
};

const rules: PracticeRule[] = [
  {
    category: "SOLID",
    rule_text:
      "Single Responsibility Principle: a module, class, or function should have one clear reason to change; separate orchestration, validation, persistence, and rendering when they evolve independently."
  },
  {
    category: "SOLID",
    rule_text:
      "Open Closed Principle: add behavior through composition, strategy objects, or narrow extension points instead of editing stable conditionals every time a new case appears."
  },
  {
    category: "SOLID",
    rule_text:
      "Liskov Substitution Principle: subclasses and implementations must preserve caller expectations, including error behavior, nullability, ordering, side effects, and return shape."
  },
  {
    category: "SOLID",
    rule_text:
      "Interface Segregation Principle: avoid broad parameter objects and service interfaces that force callers to depend on capabilities they never use."
  },
  {
    category: "SOLID",
    rule_text:
      "Dependency Inversion Principle: business rules should depend on abstractions at boundaries so databases, queues, HTTP clients, and model providers can be replaced or mocked."
  },
  {
    category: "OWASP",
    rule_text:
      "Validate and normalize untrusted input at the boundary, then use parameterized APIs for SQL, command execution, LDAP, and NoSQL queries to prevent injection."
  },
  {
    category: "OWASP",
    rule_text:
      "Encode user-controlled values before rendering HTML, attributes, JavaScript, CSS, URLs, or Markdown previews to prevent cross-site scripting."
  },
  {
    category: "OWASP",
    rule_text:
      "Never trust client-side authorization decisions; enforce object ownership, role checks, and tenant scoping on every server-side data access path."
  },
  {
    category: "OWASP",
    rule_text:
      "Secrets, API tokens, private keys, and webhook signing secrets must come from environment or secret stores and must never be committed, logged, or returned to clients."
  },
  {
    category: "OWASP",
    rule_text:
      "Authentication flows should use secure, httpOnly, sameSite cookies or short-lived tokens with refresh rotation, replay protection, and explicit logout invalidation."
  },
  {
    category: "OWASP",
    rule_text:
      "File upload handlers must enforce allowlisted MIME types, size limits, safe storage paths, malware scanning where appropriate, and randomized server-side names."
  },
  {
    category: "OWASP",
    rule_text:
      "Security-sensitive errors should be specific in server logs but generic to clients; do not expose stack traces, provider responses, tokens, SQL, or filesystem paths."
  },
  {
    category: "Clean Code",
    rule_text:
      "Functions over about 40 lines or with several abstraction levels usually need extraction into named helpers that reveal intent and reduce review burden."
  },
  {
    category: "Clean Code",
    rule_text:
      "Prefer intention-revealing names over type or implementation names; names should describe domain meaning and failure modes, not merely data structure choices."
  },
  {
    category: "Clean Code",
    rule_text:
      "Boolean parameters that radically alter behavior often hide two different operations; split them into named functions or a discriminated union."
  },
  {
    category: "Clean Code",
    rule_text:
      "Deep nesting makes error paths hard to inspect; prefer guard clauses, early returns, small pure functions, and explicit state transitions."
  },
  {
    category: "Clean Code",
    rule_text:
      "Comments should explain why a non-obvious decision exists; comments that restate syntax usually become stale and should be replaced with clearer code."
  },
  {
    category: "Clean Code",
    rule_text:
      "Dead code, unreachable branches, and unused exports raise maintenance cost and can hide security-sensitive behavior from reviewers and static analysis."
  },
  {
    category: "Reliability",
    rule_text:
      "Every awaited network, database, or filesystem operation needs timeout, cancellation, retry, or user-visible recovery semantics appropriate to the operation."
  },
  {
    category: "Reliability",
    rule_text:
      "Unhandled promises and floating async calls can lose failures; explicitly await, return, or attach rejection handling with structured logging."
  },
  {
    category: "Reliability",
    rule_text:
      "Null, undefined, empty arrays, and missing object keys should be modeled directly in types and handled before dereferencing nested values."
  },
  {
    category: "Reliability",
    rule_text:
      "Pagination and batch loops need explicit termination conditions and stable cursors to avoid skipped rows, duplicated work, and infinite loops."
  },
  {
    category: "Reliability",
    rule_text:
      "Date, time zone, and currency logic should avoid locale-dependent parsing and should preserve exact units through storage, arithmetic, and display."
  },
  {
    category: "Performance",
    rule_text:
      "Avoid N+1 database or API loops; batch requests, prefetch related records, or push filtering and aggregation down to the data store."
  },
  {
    category: "Performance",
    rule_text:
      "React components should avoid recomputing expensive derived values and recreating unstable callbacks when doing so forces large child trees to rerender."
  },
  {
    category: "Performance",
    rule_text:
      "Synchronous CPU-heavy work in request handlers, render paths, and event handlers should move to workers, queues, streaming, or incremental processing."
  },
  {
    category: "Performance",
    rule_text:
      "Large lists should use pagination, windowing, stable keys, and bounded payload shapes instead of rendering or transferring unbounded collections."
  },
  {
    category: "TypeScript",
    rule_text:
      "Use discriminated unions for variant state instead of loosely related optional fields; this gives exhaustive checks and prevents invalid combinations."
  },
  {
    category: "TypeScript",
    rule_text:
      "Avoid any at module boundaries; parse unknown input with runtime validation before converting it into trusted application types."
  },
  {
    category: "TypeScript",
    rule_text:
      "Prefer readonly data and pure transformations for reviewable business logic; mutate deliberately only where ownership and lifecycle are obvious."
  },
  {
    category: "API Design",
    rule_text:
      "Server APIs should return stable, typed error envelopes with machine-readable codes so clients can show accurate states and telemetry can group failures."
  },
  {
    category: "API Design",
    rule_text:
      "Idempotent operations should accept deduplication keys or deterministic identifiers when retries can create duplicate side effects."
  },
  {
    category: "Observability",
    rule_text:
      "Log structured events at service boundaries with correlation IDs, operation names, durations, outcome, and sanitized error context."
  },
  {
    category: "Observability",
    rule_text:
      "Metrics should distinguish latency, throughput, error rate, saturation, cache hit rate, and provider-specific failures to make regressions debuggable."
  },
  {
    category: "Testing",
    rule_text:
      "High-risk business logic needs tests for success, invalid input, boundary values, concurrency, provider failures, and authorization failures."
  },
  {
    category: "Testing",
    rule_text:
      "Mock external systems at stable boundaries while preserving contract shape; avoid tests that only assert implementation details or copied fixtures."
  }
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toPgVector(values: number[]): string {
  if (values.length !== 768) {
    throw new Error(`Expected 768-dimensional CodeBERT embedding, received ${values.length}`);
  }

  return `[${values.map((value) => Number(value.toFixed(8))).join(",")}]`;
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  requireEnv("HUGGING_FACE_API_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    realtime: { transport: webSocketTransport }
  });

  const { error: deleteError } = await supabase
    .from("best_practices")
    .delete()
    .neq("rule_text", "__never_matches__");

  if (deleteError) {
    throw new Error(`Failed to clear best practices: ${deleteError.message}`);
  }

  for (const [index, rule] of rules.entries()) {
    const embedding = await embedText(`${rule.category}: ${rule.rule_text}`);
    const { error } = await supabase.from("best_practices").insert({
      category: rule.category,
      rule_text: rule.rule_text,
      embedding: toPgVector(embedding)
    });

    if (error) {
      throw new Error(`Failed to insert rule ${index + 1}: ${error.message}`);
    }

    console.log(`Seeded ${index + 1}/${rules.length}: ${rule.category}`);
  }

  console.log(`Seed complete. Inserted ${rules.length} best-practice rules.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
