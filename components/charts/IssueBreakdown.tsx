"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReviewHistoryRecord, ToolName } from "@/lib/types";

type IssueBreakdownProps = {
  records: ReviewHistoryRecord[];
};

const toolLabels: Record<ToolName, string> = {
  bugDetector: "Bugs",
  securityScanner: "Security",
  complexityAnalyzer: "Complexity",
  styleChecker: "Style",
  performanceAuditor: "Perf"
};

const colors = ["#00ff9d", "#ffaa00", "#ff4444", "#7dd3fc", "#f472b6", "#a3e635"];

export function IssueBreakdown({ records }: IssueBreakdownProps) {
  const issueData = Object.entries(
    records.reduce<Record<string, number>>((accumulator, record) => {
      for (const result of record.tool_results ?? []) {
        accumulator[result.tool] = (accumulator[result.tool] ?? 0) + result.issues.length;
      }
      return accumulator;
    }, {})
  ).map(([tool, count]) => ({ tool: toolLabels[tool as ToolName] ?? tool, count }));

  const languageData = Object.entries(
    records.reduce<Record<string, number>>((accumulator, record) => {
      accumulator[record.language] = (accumulator[record.language] ?? 0) + 1;
      return accumulator;
    }, {})
  ).map(([language, count]) => ({ language, count }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-72 border border-white/10 bg-[#101010] p-4">
        <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[#ffaa00]">Issue Types</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={issueData}>
            <XAxis dataKey="tool" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
            />
            <Bar dataKey="count" fill="#ffaa00" radius={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-72 border border-white/10 bg-[#101010] p-4">
        <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[#00ff9d]">Languages</h3>
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie data={languageData} dataKey="count" nameKey="language" innerRadius={56} outerRadius={92} paddingAngle={3}>
              {languageData.map((entry, index) => (
                <Cell key={entry.language} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
