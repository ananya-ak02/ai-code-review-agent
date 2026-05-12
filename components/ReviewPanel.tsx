"use client";

import type { ReviewResult, ToolName, ToolResult } from "@/lib/types";
import { ProgressStream } from "./ProgressStream";
import { ScoreRing } from "./ScoreRing";
import { ToolCard } from "./ToolCard";

type ToolState = {
  tool: ToolName;
  label: string;
  status: "queued" | "running" | "complete";
  result?: ToolResult;
};

type ReviewPanelProps = {
  loading: boolean;
  cached: boolean;
  tools: ToolState[];
  results: ToolResult[];
  synthesis: string;
  review: ReviewResult | null;
  error: string | null;
};

export function ReviewPanel({ loading, cached, tools, results, synthesis, review, error }: ReviewPanelProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-white/10 bg-[#0a0a0a]">
      <div className="scanline border-b border-white/10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#00ff9d]">Review Console</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Agent findings</h2>
          </div>
          {review ? <ScoreRing score={review.overallScore} size={76} stroke={6} /> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
          {cached ? <span className="border border-[#00ff9d]/40 bg-[#00ff9d]/10 px-2 py-1 text-[#00ff9d]">Cached</span> : null}
          {loading ? <span className="border border-[#ffaa00]/40 bg-[#ffaa00]/10 px-2 py-1 text-[#ffaa00]">Streaming</span> : null}
          {review ? (
            <span className="border border-white/10 bg-white/[0.03] px-2 py-1 text-white/60">
              {review.issuesCount} total issues
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          <ProgressStream tools={tools} />

          {error ? <div className="border border-[#ff4444]/40 bg-[#ff4444]/10 p-3 text-sm text-[#ffb3b3]">{error}</div> : null}

          {synthesis ? (
            <section className="border border-white/10 bg-[#101010] p-4">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffaa00]">
                Final Synthesis
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-white/76">{synthesis}</p>
            </section>
          ) : !loading && results.length === 0 ? (
            <section className="border border-dashed border-white/15 bg-white/[0.02] p-6 text-sm leading-6 text-white/48">
              Paste code or fetch a public GitHub file, then run the agent. Tool output will stream here as each
              specialist finishes.
            </section>
          ) : null}

          {results.map((result) => (
            <ToolCard key={result.tool} result={result} />
          ))}
        </div>
      </div>
    </aside>
  );
}
