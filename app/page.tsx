"use client";

import { useMemo, useState } from "react";
import { Github, Play, RotateCcw } from "lucide-react";
import { Editor } from "@/components/Editor";
import { ReviewPanel } from "@/components/ReviewPanel";
import type { AgentProgressEvent, ReviewResult, ToolName, ToolResult } from "@/lib/types";

type ToolState = {
  tool: ToolName;
  label: string;
  status: "queued" | "running" | "complete";
  result?: ToolResult;
};

const initialTools: ToolState[] = [
  { tool: "bugDetector", label: "Bug Detector", status: "queued" },
  { tool: "securityScanner", label: "Security Scanner", status: "queued" },
  { tool: "complexityAnalyzer", label: "Complexity Analyzer", status: "queued" },
  { tool: "styleChecker", label: "Style Checker", status: "queued" },
  { tool: "performanceAuditor", label: "Performance Auditor", status: "queued" }
];

const sampleCode = `type User = { id: string; name?: string; role: string };

export async function renderUsers(users: User[] | null, query: string) {
  const rows: string[] = [];

  for (let i = 0; i <= users!.length; i++) {
    const user = users![i];
    if (user.role == "admin" || query.includes(user.name!)) {
      rows.push("<li>" + user.name + "</li>");
    }
  }

  fetch("/api/audit", {
    method: "POST",
    body: JSON.stringify({ query, secret: "sk_live_demo_key" })
  });

  return "<ul>" + rows.join("") + "</ul>";
}`;

const defaultOwner = "vercel";
const defaultRepo = "next.js";
const defaultPath = "packages/next/src/server/web/spec-extension/request.ts";

function updateTool(tools: ToolState[], event: AgentProgressEvent): ToolState[] {
  if (!event.tool) {
    return tools;
  }

  return tools.map((tool) => {
    if (tool.tool !== event.tool) {
      return tool;
    }

    if (event.type === "tool-start") {
      return { ...tool, status: "running" };
    }

    if (event.type === "tool-complete" && event.result) {
      return { ...tool, status: "complete", result: event.result };
    }

    return tool;
  });
}

function mergeCompletedResults(tools: ToolState[]): ToolResult[] {
  return tools.flatMap((tool) => (tool.result ? [tool.result] : []));
}

function extractGitHubUrl(value: string): string | null {
  return value.match(/https?:\/\/(?:github\.com|raw\.githubusercontent\.com)\/\S+/)?.[0] ?? null;
}

function containsGitHubUrl(value: string): boolean {
  return extractGitHubUrl(value) !== null;
}

function parseGitHubFileUrl(value: string): { owner: string; repo: string; path: string; ref: string } | null {
  const candidate = extractGitHubUrl(value) ?? value.trim();
  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (url.hostname === "github.com" && segments.length >= 5 && segments[2] === "blob") {
    return {
      owner: segments[0],
      repo: segments[1],
      ref: decodeURIComponent(segments[3]),
      path: segments.slice(4).map(decodeURIComponent).join("/")
    };
  }

  if (url.hostname === "raw.githubusercontent.com" && segments.length >= 4) {
    return {
      owner: segments[0],
      repo: segments[1],
      ref: decodeURIComponent(segments[2]),
      path: segments.slice(3).map(decodeURIComponent).join("/")
    };
  }

  return null;
}

export default function HomePage() {
  const [mode, setMode] = useState<"paste" | "github">("paste");
  const [code, setCode] = useState(sampleCode);
  const [language, setLanguage] = useState("typescript");
  const [owner, setOwner] = useState(defaultOwner);
  const [repo, setRepo] = useState(defaultRepo);
  const [path, setPath] = useState(defaultPath);
  const [ref, setRef] = useState("");
  const [tools, setTools] = useState<ToolState[]>(initialTools);
  const [synthesis, setSynthesis] = useState("");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => mergeCompletedResults(tools), [tools]);

  function resetWorkspace(): void {
    setMode("paste");
    setCode(sampleCode);
    setLanguage("typescript");
    setOwner(defaultOwner);
    setRepo(defaultRepo);
    setPath(defaultPath);
    setRef("");
    setTools(initialTools);
    setSynthesis("");
    setReview(null);
    setCached(false);
    setError(null);
  }

  function applyGitHubFileUrl(value: string): boolean {
    const parsed = parseGitHubFileUrl(value);

    if (!parsed) {
      return false;
    }

    setOwner(parsed.owner);
    setRepo(parsed.repo);
    setPath(parsed.path);
    setRef(parsed.ref);
    setError(null);
    return true;
  }

  async function loadGitHubFile(): Promise<void> {
    setGithubLoading(true);
    setError(null);

    try {
      const parsed = parseGitHubFileUrl(path) ?? parseGitHubFileUrl(owner);
      if (!parsed && (containsGitHubUrl(path) || containsGitHubUrl(owner))) {
        throw new Error("Paste a GitHub file URL that includes /blob/<branch>/path/to/file.");
      }

      const request = parsed
        ? {
            owner: parsed.owner,
            repo: parsed.repo,
            path: parsed.path,
            ref: ref.trim() || parsed.ref
          }
        : { owner, repo, path, ref };

      const params = new URLSearchParams({
        owner: request.owner,
        repo: request.repo,
        path: request.path
      });
      if (request.ref.trim()) {
        params.set("ref", request.ref.trim());
      }
      const response = await fetch(`/api/github?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "GitHub fetch failed.");
      }

      setCode(payload.content);
      setOwner(request.owner);
      setRepo(request.repo);
      setPath(payload.path);
      setRef(request.ref);
      const extension = String(payload.path).split(".").pop();
      if (extension === "ts") setLanguage("typescript");
      if (extension === "tsx") setLanguage("tsx");
      if (extension === "js") setLanguage("javascript");
      if (extension === "jsx") setLanguage("jsx");
      if (extension === "py") setLanguage("python");
      if (extension === "go") setLanguage("go");
      if (extension === "rs") setLanguage("rust");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to fetch GitHub file.");
    } finally {
      setGithubLoading(false);
    }
  }

  async function runReview(): Promise<void> {
    setLoading(true);
    setError(null);
    setReview(null);
    setCached(false);
    setSynthesis("");
    setTools(initialTools);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language })
      });

      setCached(response.headers.get("X-Review-Cache") === "HIT");

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({ error: "Review request failed." }));
        throw new Error(payload.error ?? "Review request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventText of events) {
          const dataLine = eventText
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) {
            continue;
          }

          const event = JSON.parse(dataLine.slice(6)) as AgentProgressEvent;
          if (event.type === "tool-start" || event.type === "tool-complete") {
            setTools((current) => updateTool(current, event));
          }
          if (event.type === "synthesis-token" && event.token) {
            setSynthesis((current) => current + event.token);
          }
          if (event.type === "complete" && event.review) {
            setReview(event.review);
            setCached(event.review.cached || response.headers.get("X-Review-Cache") === "HIT");
            setSynthesis(event.review.synthesis);
            setTools(
              initialTools.map((tool) => ({
                ...tool,
                status: "complete",
                result: event.review?.toolResults.find((result) => result.tool === tool.tool)
              }))
            );
          }
          if (event.type === "error") {
            throw new Error(event.message ?? "Review failed.");
          }
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#0a0a0a] text-white">
      <div className="flex h-full flex-col">
        <header className="scanline flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#00ff9d]">AI Review Agent</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">Five-lens production code review</h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/dashboard"
              className="border border-white/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-white/70 transition hover:border-[#00ff9d]/50 hover:text-[#00ff9d]"
            >
              Dashboard
            </a>
            <button
              type="button"
              onClick={resetWorkspace}
              className="inline-flex h-9 items-center gap-2 border border-white/10 px-3 font-mono text-xs uppercase tracking-[0.16em] text-white/60 transition hover:border-white/25 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={runReview}
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 border border-[#00ff9d]/45 bg-[#00ff9d]/10 px-3 font-mono text-xs uppercase tracking-[0.16em] text-[#00ff9d] transition hover:bg-[#00ff9d]/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {loading ? "Reviewing" : "Run Agent"}
            </button>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 lg:grid-cols-[60fr_40fr]">
          <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0d0d0d] px-4 py-3">
              <div className="flex border border-white/10 p-0.5">
                {(["paste", "github"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className={`px-3 py-1.5 font-mono text-xs uppercase tracking-[0.16em] transition ${
                      mode === item ? "bg-[#00ff9d] text-black" : "text-white/55 hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {mode === "github" ? (
                <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                  <input
                    value={owner}
                    onChange={(event) => setOwner(event.target.value)}
                    placeholder="owner"
                    className="h-8 w-24 border border-white/10 bg-black px-2 font-mono text-xs text-white outline-none focus:border-[#00ff9d]"
                  />
                  <input
                    value={repo}
                    onChange={(event) => setRepo(event.target.value)}
                    placeholder="repo"
                    className="h-8 w-28 border border-white/10 bg-black px-2 font-mono text-xs text-white outline-none focus:border-[#00ff9d]"
                  />
                  <input
                    value={path}
                    onPaste={(event) => {
                      const pasted = event.clipboardData.getData("text");
                      if (applyGitHubFileUrl(pasted)) {
                        event.preventDefault();
                      }
                    }}
                    onChange={(event) => {
                      const nextPath = event.target.value;

                      if (applyGitHubFileUrl(nextPath)) {
                        return;
                      }

                      setPath(nextPath);
                    }}
                    placeholder="src/file.ts"
                    className="h-8 min-w-[220px] flex-1 border border-white/10 bg-black px-2 font-mono text-xs text-white outline-none focus:border-[#00ff9d]"
                  />
                  <input
                    value={ref}
                    onChange={(event) => setRef(event.target.value)}
                    placeholder="ref"
                    className="h-8 w-24 border border-white/10 bg-black px-2 font-mono text-xs text-white outline-none focus:border-[#00ff9d]"
                  />
                  <button
                    type="button"
                    onClick={loadGitHubFile}
                    disabled={githubLoading}
                    className="inline-flex h-8 items-center gap-2 border border-[#ffaa00]/45 bg-[#ffaa00]/10 px-3 font-mono text-xs uppercase tracking-[0.16em] text-[#ffaa00] disabled:opacity-50"
                  >
                    <Github className="h-3.5 w-3.5" />
                    {githubLoading ? "Fetching" : "Fetch"}
                  </button>
                </div>
              ) : (
                <p className="font-mono text-xs text-white/38">Paste mode keeps everything local until review starts.</p>
              )}
            </div>
            <Editor value={code} onChange={setCode} language={language} onLanguageChange={setLanguage} />
          </div>

          <ReviewPanel
            loading={loading}
            cached={cached}
            tools={tools}
            results={results}
            synthesis={synthesis}
            review={review}
            error={error}
          />
        </section>
      </div>
    </main>
  );
}
