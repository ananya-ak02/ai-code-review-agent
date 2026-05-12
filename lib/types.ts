export type Severity = "critical" | "high" | "medium" | "low";

export type ReviewIssue = {
  line: number;
  description: string;
  fix: string;
  originalSnippet?: string;
  suggestedSnippet?: string;
};

export type ToolName =
  | "bugDetector"
  | "securityScanner"
  | "complexityAnalyzer"
  | "styleChecker"
  | "performanceAuditor";

export type ToolResult = {
  tool: ToolName;
  label: string;
  severity: Severity;
  issues: ReviewIssue[];
  score: number;
  summary: string;
};

export type ReviewResult = {
  codeHash: string;
  language: string;
  overallScore: number;
  issuesCount: number;
  toolResults: ToolResult[];
  synthesis: string;
  bestPractices: BestPracticeMatch[];
  cached: boolean;
  createdAt: string;
};

export type BestPracticeMatch = {
  id: string;
  category: string;
  rule_text: string;
  similarity: number;
};

export type ReviewHistoryRecord = {
  id: string;
  code_hash: string;
  language: string;
  overall_score: number;
  issues_count: number;
  tool_results: ToolResult[];
  created_at: string;
};

export type AgentProgressEvent = {
  type: "tool-start" | "tool-complete" | "synthesis-token" | "complete" | "error";
  tool?: ToolName;
  label?: string;
  result?: ToolResult;
  token?: string;
  review?: ReviewResult;
  message?: string;
};
