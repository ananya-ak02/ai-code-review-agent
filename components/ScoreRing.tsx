"use client";

import type { CSSProperties } from "react";

type ScoreRingProps = {
  score: number;
  size?: number;
  stroke?: number;
};

function colorForScore(score: number): string {
  if (score >= 80) {
    return "#00ff9d";
  }
  if (score >= 55) {
    return "#ffaa00";
  }
  return "#ff4444";
}

export function ScoreRing({ score, size = 62, stroke = 5 }: ScoreRingProps) {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;
  const color = colorForScore(normalized);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeLinecap="square"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring"
          style={{ "--score-offset": offset, "--score-circumference": circumference } as CSSProperties}
        />
      </svg>
      <span className="absolute font-mono text-sm font-semibold" style={{ color }}>
        {normalized}
      </span>
    </div>
  );
}
