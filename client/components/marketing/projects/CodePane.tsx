"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { CodeLang } from "./types";

const KEYWORDS: Record<Exclude<CodeLang, "blocks" | "css">, Set<string>> = {
  py: new Set(["import", "from", "def", "return", "if", "elif", "else", "for", "in", "while", "and", "or", "not", "True", "False", "None", "class", "with", "as", "print"]),
  js: new Set(["const", "let", "var", "function", "return", "if", "else", "for", "new", "true", "false", "null", "await", "async", "import", "from"]),
  lua: new Set(["local", "function", "end", "if", "then", "else", "elseif", "for", "do", "while", "return", "true", "false", "nil", "and", "or", "not"]),
  cs: new Set(["void", "if", "else", "for", "foreach", "return", "new", "true", "false", "null", "public", "private", "class", "int", "float", "string", "var"]),
};

const COMMENT: Record<Exclude<CodeLang, "blocks">, string> = {
  py: "#.*$",
  js: "\\/\\/.*$",
  lua: "--.*$",
  cs: "\\/\\/.*$",
  css: "\\/\\*.*?(?:\\*\\/|$)",
};

const BLOCK_COLORS: Record<string, string> = {
  events: "bg-[#FFBF00] text-[#4D3800]",
  looks: "bg-[#9966FF] text-white",
  sound: "bg-[#CF63CF] text-white",
  variables: "bg-[#FF8C1A] text-white",
  control: "bg-[#FFAB19] text-[#4D3800]",
  sensing: "bg-[#5CB1D6] text-white",
  motion: "bg-[#4C97FF] text-white",
};

/** Colours one line of code. Tiny on purpose: good enough for 10-line teaching snippets. */
function highlight(line: string, lang: Exclude<CodeLang, "blocks">): ReactNode[] {
  const extra = lang === "css" ? "|--[\\w-]+|#[0-9a-fA-F]{3,8}\\b" : "";
  const re = new RegExp(`(${COMMENT[lang]}|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'${extra}|\\b\\d+(?:\\.\\d+)?\\b|[A-Za-z_]\\w*)`, "g");
  const commentStart = new RegExp(`^(?:${COMMENT[lang]})`);
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const t = m[0];
    let cls = "";
    if (commentStart.test(t)) cls = "text-slate-500 italic";
    else if (t.startsWith('"') || t.startsWith("'")) cls = "text-emerald-300";
    else if (lang === "css" && t.startsWith("--")) cls = "text-sky-300";
    else if (lang === "css" && t.startsWith("#")) cls = "text-amber-300";
    else if (/^\d/.test(t)) cls = "text-amber-300";
    else if (lang !== "css" && KEYWORDS[lang].has(t)) cls = "text-purple-300 font-semibold";
    else if (/^[A-Za-z_]/.test(t) && line.slice(m.index + t.length).startsWith("(")) cls = "text-sky-300";
    out.push(cls ? <span key={i++} className={cls}>{t}</span> : t);
    last = m.index + t.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

function BlockLine({ line }: { line: string }) {
  const indent = line.length - line.trimStart().length;
  const rest = line.trimStart();
  const colon = rest.indexOf(":");
  const cat = rest.slice(0, colon);
  const text = rest.slice(colon + 1);
  const parts = text.split(/(\[[^\]]*\]|\([^)]*\)|<[^>]*>)/g).filter(Boolean);
  return (
    <span
      className={`inline-block rounded-lg px-2.5 py-1 text-[12px] font-bold leading-snug shadow-[inset_0_-2px_0_rgba(0,0,0,.22)] ${BLOCK_COLORS[cat] ?? "bg-slate-500 text-white"}`}
      style={{ marginLeft: (indent / 2) * 14 }}
    >
      {parts.map((p, i) =>
        /^[[(<]/.test(p) ? (
          <span key={i} className="mx-0.5 rounded-full bg-white px-2 py-px text-slate-800 font-bold">{p.slice(1, -1)}</span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}

export default function CodePane({
  file,
  lang,
  lines,
  flashLine,
  typing,
  onSkip,
}: {
  file: string;
  lang: CodeLang;
  lines: string[];
  flashLine: number | null;
  typing: boolean;
  onSkip: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);

  // Keep the highlighted line visible inside the code box without scrolling the whole modal.
  useEffect(() => {
    const c = box.current;
    const el = flashLine === null ? null : rows.current[flashLine];
    if (!c || !el) return;
    if (el.offsetTop < c.scrollTop + 8 || el.offsetTop + el.offsetHeight > c.scrollTop + c.clientHeight - 8) {
      c.scrollTo({ top: Math.max(0, el.offsetTop - 40), behavior: "smooth" });
    }
  }, [flashLine]);

  const isBlocks = lang === "blocks";

  return (
    <div className={`flex flex-col h-full ${isBlocks ? "bg-[#F4F6FF] dark:bg-[#10162B]" : "bg-[#0D1117]"}`}>
      <div className={`flex items-center gap-1.5 px-4 py-2.5 border-b ${isBlocks ? "bg-violet-600 border-violet-700" : "bg-[#161B22] border-white/10"}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        <span className={`ml-2 text-[11px] font-mono ${isBlocks ? "text-white/90" : "text-slate-400"}`}>{file}</span>
        <span className={`ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold ${isBlocks ? "text-white" : "text-emerald-300"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${typing ? "bg-amber-300 animate-pulse" : "bg-emerald-400"}`} />
          {typing ? "writing code…" : "running"}
        </span>
      </div>
      <div
        ref={box}
        onClick={typing ? onSkip : undefined}
        className={`flex-1 overflow-auto px-3 py-3 max-h-[230px] md:max-h-none ${typing ? "cursor-pointer" : ""}`}
        title={typing ? "Click to skip the typing" : undefined}
      >
        {isBlocks ? (
          <div className="space-y-1.5">
            {lines.map((l, i) => (
              <div
                key={i}
                ref={(el) => { rows.current[i] = el; }}
                className={`rounded-lg transition-all duration-300 ${flashLine === i ? "ring-2 ring-offset-2 ring-offset-[#F4F6FF] dark:ring-offset-[#10162B] ring-purple-500 scale-[1.02] origin-left" : ""}`}
              >
                {l.includes(":") ? <BlockLine line={l} /> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="font-mono text-[12.5px] leading-[1.55rem] text-slate-300">
            {lines.map((l, i) => (
              <div
                key={i}
                ref={(el) => { rows.current[i] = el; }}
                className={`flex gap-3 rounded px-1 transition-colors duration-300 ${flashLine === i ? "bg-amber-300/20 shadow-[inset_3px_0_0_#FCD34D]" : ""}`}
              >
                <span className="w-5 flex-none text-right text-slate-600 select-none">{i + 1}</span>
                <span className="whitespace-pre-wrap break-words min-w-0">
                  {highlight(l, lang)}
                  {typing && i === lines.length - 1 && <span className="code-cursor text-white">▎</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
