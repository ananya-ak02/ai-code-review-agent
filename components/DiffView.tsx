"use client";

type DiffViewProps = {
  original?: string;
  suggested?: string;
};

function lines(value?: string): string[] {
  const source = value?.trimEnd();
  return source ? source.split("\n") : ["No snippet supplied."];
}

export function DiffView({ original, suggested }: DiffViewProps) {
  const originalLines = lines(original);
  const suggestedLines = lines(suggested);

  return (
    <div className="grid gap-2 border border-white/10 bg-black/30 p-2 font-mono text-[11px] leading-5 md:grid-cols-2">
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-[0.24em] text-[#ff4444]">Original</div>
        <pre className="overflow-x-auto border-l-2 border-[#ff4444] bg-[#2a0909]/60 p-2 text-[#ffb3b3]">
          {originalLines.map((line, index) => (
            <code key={`o-${index}`} className="block whitespace-pre">
              <span className="mr-2 select-none text-[#ff4444]/70">-</span>
              {line}
            </code>
          ))}
        </pre>
      </div>
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-[0.24em] text-[#00ff9d]">Suggested</div>
        <pre className="overflow-x-auto border-l-2 border-[#00ff9d] bg-[#062218]/70 p-2 text-[#b8ffe3]">
          {suggestedLines.map((line, index) => (
            <code key={`s-${index}`} className="block whitespace-pre">
              <span className="mr-2 select-none text-[#00ff9d]/70">+</span>
              {line}
            </code>
          ))}
        </pre>
      </div>
    </div>
  );
}
