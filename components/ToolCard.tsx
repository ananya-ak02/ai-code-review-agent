"use client";

import { useState } from "react";
import { ChevronDown, Clipboard, ShieldAlert } from "lucide-react";
import type { ToolResult } from "@/lib/types";
import { DiffView } from "./DiffView";
import { ScoreRing } from "./ScoreRing";

type ToolCardProps = {
  result: ToolResult;
};

const severityClass = {
  critical: "border-[#ff4444] bg-[#ff4444]/15 text-[#ffb3b3]",
  high: "border-[#ff4444] bg-[#ff4444]/10 text-[#ff9d9d]",
  medium: "border-[#ffaa00] bg-[#ffaa00]/10 text-[#ffd27a]",
  low: "border-[#00ff9d] bg-[#00ff9d]/10 text-[#9effd8]"
};

export function ToolCard({ result }: ToolCardProps) {
  const [open, setOpen] = useState(result.issues.length > 0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function copyFix(text: string, index: number): Promise<void> {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1300);
  }

  return (
    <section className="border border-white/10 bg-[#101010] shadow-[0_0_0_1px_rgba(0,255,157,0.03)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/[0.03]"
      >
        <ScoreRing score={result.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-white">
              {result.label}
            </h3>
            <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${severityClass[result.severity]}`}>
              {result.severity}
            </span>
            <span className="font-mono text-[11px] text-white/45">{result.issues.length} issues</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-white/62">{result.summary}</p>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 text-white/45 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          {result.issues.length === 0 ? (
            <div className="flex items-center gap-2 border border-[#00ff9d]/20 bg-[#00ff9d]/5 p-3 text-sm text-[#9effd8]">
              <ShieldAlert className="h-4 w-4" />
              No material issues found by this specialist.
            </div>
          ) : (
            <div className="space-y-4">
              {result.issues.map((issue, index) => (
                <article key={`${result.tool}-${issue.line}-${index}`} className="border-l border-white/15 pl-3">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#ffaa00]">
                        Line {issue.line}
                      </div>
                      <p className="mt-1 text-sm text-white/78">{issue.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyFix(issue.suggestedSnippet || issue.fix, index)}
                      className="inline-flex h-8 items-center gap-2 border border-[#00ff9d]/30 px-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#00ff9d] transition hover:bg-[#00ff9d]/10"
                    >
                      <Clipboard className="h-3.5 w-3.5" />
                      {copiedIndex === index ? "Copied" : "Apply Fix"}
                    </button>
                  </div>
                  <p className="mb-3 border border-white/10 bg-black/25 p-2 text-sm text-white/65">{issue.fix}</p>
                  <DiffView original={issue.originalSnippet} suggested={issue.suggestedSnippet || issue.fix} />
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
