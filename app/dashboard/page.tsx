"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, GitCompareArrows, RefreshCw } from "lucide-react";
import { IssueBreakdown } from "@/components/charts/IssueBreakdown";
import { ScoreHistory } from "@/components/charts/ScoreHistory";
import type { ReviewHistoryRecord } from "@/lib/types";

export default function DashboardPage() {
  const [records, setRecords] = useState<ReviewHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  async function loadHistory(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/history?limit=80", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load history.");
      }
      setRecords(payload.history);
      setLeftId(payload.history[1]?.id ?? payload.history[0]?.id ?? "");
      setRightId(payload.history[0]?.id ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  const selected = useMemo(() => {
    const left = records.find((record) => record.id === leftId);
    const right = records.find((record) => record.id === rightId);
    return { left, right };
  }, [leftId, records, rightId]);

  const scoreDelta =
    selected.left && selected.right ? selected.right.overall_score - selected.left.overall_score : 0;
  const issueDelta = selected.left && selected.right ? selected.right.issues_count - selected.left.issues_count : 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="scanline border-b border-white/10 px-5 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-white/45 hover:text-[#00ff9d]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Workstation
            </a>
            <h1 className="mt-3 text-2xl font-semibold">Review intelligence dashboard</h1>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            className="inline-flex h-9 items-center gap-2 border border-white/10 px-3 font-mono text-xs uppercase tracking-[0.16em] text-white/65 transition hover:border-[#00ff9d]/50 hover:text-[#00ff9d]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-4 px-5 py-6">
        {error ? <div className="border border-[#ff4444]/40 bg-[#ff4444]/10 p-3 text-[#ffb3b3]">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="border border-white/10 bg-[#101010] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Reviews</p>
            <p className="mt-2 font-mono text-3xl text-white">{records.length}</p>
          </div>
          <div className="border border-white/10 bg-[#101010] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Average Score</p>
            <p className="mt-2 font-mono text-3xl text-[#00ff9d]">
              {records.length
                ? Math.round(records.reduce((sum, record) => sum + record.overall_score, 0) / records.length)
                : 0}
            </p>
          </div>
          <div className="border border-white/10 bg-[#101010] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Total Issues</p>
            <p className="mt-2 font-mono text-3xl text-[#ffaa00]">
              {records.reduce((sum, record) => sum + record.issues_count, 0)}
            </p>
          </div>
          <div className="border border-white/10 bg-[#101010] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Languages</p>
            <p className="mt-2 font-mono text-3xl text-white">
              {new Set(records.map((record) => record.language)).size}
            </p>
          </div>
        </div>

        <ScoreHistory records={records} />
        <IssueBreakdown records={records} />

        <section className="border border-white/10 bg-[#101010] p-4">
          <div className="mb-4 flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-[#00ff9d]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">Compare Reviews</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <select
              value={leftId}
              onChange={(event) => setLeftId(event.target.value)}
              className="h-10 border border-white/10 bg-black px-3 font-mono text-xs text-white outline-none focus:border-[#00ff9d]"
            >
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {new Date(record.created_at).toLocaleString()} | {record.language} | {record.overall_score}
                </option>
              ))}
            </select>
            <select
              value={rightId}
              onChange={(event) => setRightId(event.target.value)}
              className="h-10 border border-white/10 bg-black px-3 font-mono text-xs text-white outline-none focus:border-[#00ff9d]"
            >
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {new Date(record.created_at).toLocaleString()} | {record.language} | {record.overall_score}
                </option>
              ))}
            </select>
            <div className="grid min-w-[220px] grid-cols-2 border border-white/10 font-mono text-xs">
              <div className="border-r border-white/10 p-3">
                <div className="text-white/38">Score</div>
                <div className={scoreDelta >= 0 ? "text-[#00ff9d]" : "text-[#ff4444]"}>
                  {scoreDelta >= 0 ? "+" : ""}
                  {scoreDelta}
                </div>
              </div>
              <div className="p-3">
                <div className="text-white/38">Issues</div>
                <div className={issueDelta <= 0 ? "text-[#00ff9d]" : "text-[#ffaa00]"}>
                  {issueDelta >= 0 ? "+" : ""}
                  {issueDelta}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-x-auto border border-white/10 bg-[#101010]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Issues</th>
                <th className="px-4 py-3">Hash</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/64">{new Date(record.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-[#00ff9d]">{record.language}</td>
                  <td className="px-4 py-3 font-mono">{record.overall_score}</td>
                  <td className="px-4 py-3 font-mono text-[#ffaa00]">{record.issues_count}</td>
                  <td className="px-4 py-3 font-mono text-xs text-white/42">{record.code_hash.slice(0, 18)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && records.length === 0 ? (
            <div className="p-6 text-sm text-white/45">No reviews have been saved yet.</div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
