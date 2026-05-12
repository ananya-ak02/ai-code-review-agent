import { ChatGroq } from "@langchain/groq";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { BestPracticeMatch, ReviewResult, Severity, ToolName, ToolResult } from "./types";
import { getRelevantBestPractices } from "./rag";
import { hashCode } from "./hash";

type ReviewToolSpec = {
  name: ToolName;
  label: string;
  mission: string;
};

type ProgressHandler = (event: {
  type: "tool-start" | "tool-complete" | "synthesis-token";
  tool?: ToolName;
  label?: string;
  result?: ToolResult;
  token?: string;
}) => void | Promise<void>;

const specs: ReviewToolSpec[] = [
  {
    name: "bugDetector",
    label: "Bug Detector",
    mission:
      "Find logic errors, null pointer risks, off-by-one mistakes, stale state, race conditions, unhandled promises, unreachable branches, incorrect conditions, and failure paths that could break production."
  },
  {
    name: "securityScanner",
    label: "Security Scanner",
    mission:
      "Detect injection risks, hardcoded secrets, insecure dependency patterns, SSRF, XSS vectors, unsafe deserialization, insecure auth checks, path traversal, sensitive logging, and broken authorization."
  },
  {
    name: "complexityAnalyzer",
    label: "Complexity Analyzer",
    mission:
      "Assess cyclomatic complexity, nesting depth, branching density, module coupling, repeated conditions, hidden state machines, and decomposition opportunities."
  },
  {
    name: "styleChecker",
    label: "Style Checker",
    mission:
      "Review naming, function length, dead code, comment quality, type clarity, module boundaries, readability, and whether the code communicates intent to future maintainers."
  },
  {
    name: "performanceAuditor",
    label: "Performance Auditor",
    mission:
      "Spot N+1 calls, unnecessary rerenders, missing memoization, blocking synchronous work, unbounded collections, inefficient algorithms, repeated allocations, and avoidable network or database work."
  }
];

const issueSchema = z.object({
  line: z.number().int().min(1),
  description: z.string(),
  fix: z.string(),
  originalSnippet: z.string().optional(),
  suggestedSnippet: z.string().optional()
});

const toolOutputSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low"]),
  issues: z.array(issueSchema),
  score: z.number().min(0).max(100),
  summary: z.string()
});

const toolInputSchema = z.object({
  code: z.string(),
  language: z.string(),
  bestPractices: z.string()
});

function groqModel(temperature = 0.12): ChatGroq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    temperature
  });
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) {
    return 60;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeSeverity(severity: string, issues: number, score: number): Severity {
  if (severity === "critical" || severity === "high" || severity === "medium" || severity === "low") {
    return severity;
  }
  if (score < 40 || issues > 6) {
    return "high";
  }
  if (score < 70 || issues > 2) {
    return "medium";
  }
  return "low";
}

function parseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function contextBlock(bestPractices: BestPracticeMatch[]): string {
  return bestPractices
    .map(
      (practice, index) =>
        `${index + 1}. [${practice.category}, similarity ${practice.similarity.toFixed(3)}] ${
          practice.rule_text
        }`
    )
    .join("\n");
}

function createReviewTool(spec: ReviewToolSpec): DynamicStructuredTool<typeof toolInputSchema> {
  return new DynamicStructuredTool({
    name: spec.name,
    description: spec.mission,
    schema: toolInputSchema,
    func: async ({ code, language, bestPractices }) => {
      const model = groqModel();
      const response = await model.invoke([
        [
          "system",
          [
            `You are ${spec.label}, a senior production code reviewer.`,
            spec.mission,
            "Return only valid JSON matching this shape:",
            '{"severity":"high|medium|low","issues":[{"line":23,"description":"specific issue","fix":"specific fix","originalSnippet":"short original code","suggestedSnippet":"corrected code"}],"score":0,"summary":"concise synthesis"}',
            "Use exact line numbers from the provided code. Every issue must include a practical fix and a corrected snippet when a snippet is useful.",
            "If no material issue exists, return an empty issues array, low severity, a score above 90, and a useful summary."
          ].join("\n")
        ],
        [
          "human",
          [
            `Language: ${language}`,
            "Relevant engineering rules:",
            bestPractices,
            "Code with line numbers:",
            code
              .split("\n")
              .map((line, index) => `${String(index + 1).padStart(4, " ")} | ${line}`)
              .join("\n")
          ].join("\n\n")
        ]
      ]);

      return typeof response.content === "string"
        ? response.content
        : response.content.map((part) => ("text" in part ? part.text : "")).join("");
    }
  });
}

async function runTool(
  spec: ReviewToolSpec,
  code: string,
  language: string,
  bestPractices: BestPracticeMatch[],
  onProgress?: ProgressHandler
): Promise<ToolResult> {
  await onProgress?.({ type: "tool-start", tool: spec.name, label: spec.label });

  const tool = createReviewTool(spec);
  const raw = await tool.invoke({
    code,
    language,
    bestPractices: contextBlock(bestPractices)
  });

  const parsed = toolOutputSchema.parse(parseJsonObject(String(raw)));
  const score = clampScore(parsed.score);
  const result: ToolResult = {
    tool: spec.name,
    label: spec.label,
    severity: normalizeSeverity(parsed.severity, parsed.issues.length, score),
    issues: parsed.issues.map((issue) => ({
      ...issue,
      line: Math.max(1, Math.round(issue.line))
    })),
    score,
    summary: parsed.summary
  };

  await onProgress?.({ type: "tool-complete", tool: spec.name, label: spec.label, result });
  return result;
}

function calculateOverallScore(results: ToolResult[]): number {
  const weighted = results.reduce((sum, result) => {
    const severityPenalty =
      result.severity === "critical" ? 10 : result.severity === "high" ? 6 : result.severity === "medium" ? 3 : 0;
    return sum + Math.max(0, result.score - severityPenalty);
  }, 0);

  return clampScore(weighted / Math.max(results.length, 1));
}

async function streamSynthesis(
  code: string,
  language: string,
  toolResults: ToolResult[],
  bestPractices: BestPracticeMatch[],
  onProgress?: ProgressHandler
): Promise<string> {
  const model = groqModel(0.2);
  const stream = await model.stream([
    [
      "system",
      "You are a staff engineer synthesizing a code review. Be direct, practical, and specific. Mention strongest risks first, then the highest leverage fixes. Do not use markdown tables."
    ],
    [
      "human",
      JSON.stringify(
        {
          language,
          codePreview: code.slice(0, 12000),
          bestPractices,
          toolResults
        },
        null,
        2
      )
    ]
  ]);

  let synthesis = "";
  for await (const chunk of stream) {
    const token =
      typeof chunk.content === "string"
        ? chunk.content
        : chunk.content.map((part) => ("text" in part ? part.text : "")).join("");
    if (token) {
      synthesis += token;
      await onProgress?.({ type: "synthesis-token", token });
    }
  }

  return synthesis.trim();
}

export async function runCodeReviewAgent(
  code: string,
  language: string,
  onProgress?: ProgressHandler
): Promise<ReviewResult> {
  if (!code.trim()) {
    throw new Error("Code is required for review.");
  }

  const [codeHash, bestPractices] = await Promise.all([
    hashCode(code),
    getRelevantBestPractices(code)
  ]);

  const toolResults = await Promise.all(
    specs.map((spec) => runTool(spec, code, language, bestPractices, onProgress))
  );
  const issuesCount = toolResults.reduce((sum, result) => sum + result.issues.length, 0);
  const overallScore = calculateOverallScore(toolResults);
  const synthesis = await streamSynthesis(code, language, toolResults, bestPractices, onProgress);

  return {
    codeHash,
    language,
    overallScore,
    issuesCount,
    toolResults,
    synthesis,
    bestPractices,
    cached: false,
    createdAt: new Date().toISOString()
  };
}
