"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type EditorProps = {
  value: string;
  onChange: (value: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
};

const languages = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "python",
  "go",
  "rust",
  "java",
  "csharp",
  "php",
  "ruby",
  "sql",
  "json",
  "yaml"
];

function detectLanguage(code: string, current: string): string {
  const trimmed = code.trim();
  if (!trimmed) {
    return current;
  }
  if (/^\s*[{[]/.test(trimmed) && /"\w+"\s*:/.test(trimmed)) {
    return "json";
  }
  if (/\b(import|export)\s+.*\bfrom\b|:\s*(string|number|boolean)\b|interface\s+\w+/.test(code)) {
    return code.includes("<") && /<\/?[A-Za-z]/.test(code) ? "tsx" : "typescript";
  }
  if (/\bfunction\b|\bconst\b|\blet\b|\bvar\b|=>/.test(code)) {
    return code.includes("<") && /<\/?[A-Za-z]/.test(code) ? "jsx" : "javascript";
  }
  if (/\bdef\s+\w+\(|\bimport\s+\w+|if __name__ ==/.test(code)) {
    return "python";
  }
  if (/\bpackage\s+main\b|\bfunc\s+\w+\(/.test(code)) {
    return "go";
  }
  if (/\bfn\s+\w+\(|\blet mut\b|impl\s+\w+/.test(code)) {
    return "rust";
  }
  if (/\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(code)) {
    return "sql";
  }
  return current;
}

export function Editor({ value, onChange, language, onLanguageChange }: EditorProps) {
  const detected = useMemo(() => detectLanguage(value, language), [value, language]);

  function handleChange(next?: string): void {
    const code = next ?? "";
    onChange(code);
    const nextLanguage = detectLanguage(code, language);
    if (nextLanguage !== language) {
      onLanguageChange(nextLanguage);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0d0d0d] px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/38">Input Buffer</p>
          <p className="mt-1 font-mono text-xs text-[#00ff9d]">{detected}</p>
        </div>
        <select
          value={language}
          onChange={(event) => onLanguageChange(event.target.value)}
          className="border border-white/10 bg-black px-2 py-1 font-mono text-xs text-white/70 outline-none transition focus:border-[#00ff9d]"
        >
          {languages.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="min-h-0 flex-1">
        <MonacoEditor
          theme="vs-dark"
          language={language === "tsx" ? "typescript" : language === "jsx" ? "javascript" : language}
          value={value}
          onChange={handleChange}
          options={{
            minimap: { enabled: false },
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13,
            lineHeight: 21,
            padding: { top: 18, bottom: 18 },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            smoothScrolling: true
          }}
        />
      </div>
    </div>
  );
}
