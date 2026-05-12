"use client";

import { Check, Loader2, RadioTower } from "lucide-react";
import type { ToolName, ToolResult } from "@/lib/types";

type ToolState = {
  tool: ToolName;
  label: string;
  status: "queued" | "running" | "complete";
  result?: ToolResult;
};

type ProgressStreamProps = {
  tools: ToolState[];
};

export function ProgressStream({ tools }: ProgressStreamProps) {
  return (
    <div className="border border-white/10 bg-[#0d0d0d] p-3">
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
        <RadioTower className="h-3.5 w-3.5 text-[#00ff9d]" />
        Agent Telemetry
      </div>
      <div className="space-y-2">
        {tools.map((tool) => (
          <div key={tool.tool} className="flex items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              {tool.status === "complete" ? (
                <Check className="h-4 w-4 text-[#00ff9d]" />
              ) : tool.status === "running" ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#ffaa00]" />
              ) : (
                <span className="h-4 w-4 border border-white/15" />
              )}
              <span className={tool.status === "queued" ? "text-white/35" : "text-white/80"}>{tool.label}</span>
            </div>
            <span className="text-white/42">
              {tool.status === "complete"
                ? `${tool.result?.issues.length ?? 0} issues`
                : tool.status === "running"
                  ? "running"
                  : "queued"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
