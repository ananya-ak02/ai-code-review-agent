"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReviewHistoryRecord } from "@/lib/types";

type ScoreHistoryProps = {
  records: ReviewHistoryRecord[];
};

export function ScoreHistory({ records }: ScoreHistoryProps) {
  const data = [...records]
    .reverse()
    .map((record) => ({
      date: new Date(record.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: record.overall_score
    }));

  return (
    <div className="h-72 border border-white/10 bg-[#101010] p-4">
      <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[#00ff9d]">Score Over Time</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <XAxis dataKey="date" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
          />
          <Line type="monotone" dataKey="score" stroke="#00ff9d" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
