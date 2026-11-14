'use client';

// FILE PATH: client/components/lesson/visuals/code-lab.tsx
//
// The Code Lab: an editor inside the lesson that really runs what the learner writes.
//
//   JavaScript, Python, SQL   run in the learner's own browser (Web Workers; Pyodide and SQLite as
//                             WebAssembly served from this site), with a time limit.
//   HTML / CSS / JavaScript   a live preview in a sandboxed frame that cannot reach this site.
//   C, C++, Java              run on the Lumexa code-runner service — but ONLY when the server has one. When
//                             it has none there is no Run button and the lab says why (and where else to run
//                             the code), because a button that does nothing would be worse than no button.
//
// The learner's edits are kept on this device (per lesson and block); "Reset" returns the author's code. When
// the lab has an `expected` output it compares the real output with it, line by line.

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { C } from './svg';
import { registerVisuals, type VisualProps } from './registry';
import { useLessonRender } from '../LessonContext';
import { loadServerLanguages, runCode, sameOutput } from '@/lib/codeLab/runtimes';
import { LANGUAGES, ONLINE_COMPILERS, type LabLanguage, type RunResult } from '@/lib/codeLab/types';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const READS_INPUT = /\bscanf\s*\(|\bgets\s*\(|\bfgets\s*\(|\bcin\s*>>|\bgetline\s*\(|\bScanner\b|\bBufferedReader\b|\binput\s*\(|\bprompt\s*\(|\bgetchar\s*\(/;

type Availability = 'checking' | 'yes' | 'no';

const storageKey = (lessonId: string, id: string) => `lumexa:lab:${lessonId}:${id}`;
const readStored = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStored = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* the browser may block storage: the lab still works */
  }
};

function firstDifference(actual: string, expected: string): { line: number; got: string; want: string } | null {
  const a = actual.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/\s+$/g, ''));
  const e = expected.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/\s+$/g, ''));
  while (a.length && a[a.length - 1] === '') a.pop();
  while (e.length && e[e.length - 1] === '') e.pop();
  const n = Math.max(a.length, e.length);
  for (let i = 0; i < n; i++) if ((a[i] ?? '') !== (e[i] ?? '')) return { line: i + 1, got: a[i] ?? '(no line)', want: e[i] ?? '(no line)' };
  return null;
}

export function CodeLab({ config, id, onUse }: VisualProps) {
  const language = (config.language in LANGUAGES ? config.language : 'text') as LabLanguage;
  const info = LANGUAGES[language];
  const starter = String(config.code ?? '');
  const readOnly = config.readOnly === true;
  const expected = typeof config.expected === 'string' ? config.expected : null;
  const setup = typeof config.setup === 'string' ? config.setup : '';
  const hint = typeof config.hint === 'string' ? config.hint : null;
  const starterInput = typeof config.stdin === 'string' ? config.stdin : '';
  const { lessonId } = useLessonRender();
  const key = storageKey(lessonId ?? 'lesson', id);

  const [code, setCode] = useState(starter);
  const [stdin, setStdin] = useState(starterInput);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability>(info.engine === 'server' ? 'checking' : info.engine === 'browser' ? 'yes' : 'no');
  const [escapeTab, setEscapeTab] = useState(false);
  const [previewCode, setPreviewCode] = useState(starter);
  const gutter = useRef<HTMLPreElement>(null);
  const used = useRef(false);

  // Restore what the learner wrote last time on this device.
  useEffect(() => {
    const saved = readStored(key);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved !== null && saved !== starter) setCode(saved);
  }, [key, starter]);

  // Does this server have a compiler for the language?
  useEffect(() => {
    if (info.engine !== 'server') return;
    let live = true;
    loadServerLanguages().then((s) => {
      if (live) setAvailability(s.enabled && s.languages[language]?.available ? 'yes' : 'no');
    });
    return () => {
      live = false;
    };
  }, [info.engine, language]);

  // HTML: the preview follows what is typed (a short pause so it does not flicker).
  useEffect(() => {
    if (language !== 'html') return;
    const t = setTimeout(() => setPreviewCode(code), 450);
    return () => clearTimeout(t);
  }, [code, language]);

  const touch = useCallback(() => {
    if (!used.current) {
      used.current = true;
      onUse?.();
    }
  }, [onUse]);

  const edit = (next: string) => {
    setCode(next);
    writeStored(key, next === starter ? null : next);
  };

  const run = useCallback(async () => {
    if (running || language === 'html') return;
    touch();
    setRunning(true);
    setStatus(null);
    setResult(null);
    const r = await runCode({ language, code, stdin, setup, onStatus: setStatus });
    setResult(r);
    setRunning(false);
    setStatus(null);
  }, [running, language, code, stdin, setup, touch]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void run();
      return;
    }
    // Esc then Tab leaves the editor (so the keyboard is never trapped); Tab alone indents.
    if (e.key === 'Escape') {
      setEscapeTab(true);
      return;
    }
    const el = e.currentTarget;
    if (e.key === 'Tab' && !e.shiftKey && !escapeTab) {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: en } = el;
      edit(code.slice(0, s) + '    ' + code.slice(en));
      requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
    } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      // Keep the indentation of the line being left (and one more after an opening brace or colon).
      const { selectionStart: s, selectionEnd: en } = el;
      const lineStart = code.lastIndexOf('\n', s - 1) + 1;
      const indent = /^[ ]*/.exec(code.slice(lineStart, s))?.[0] ?? '';
      const extra = /[{:(]\s*$/.test(code.slice(lineStart, s)) ? '    ' : '';
      e.preventDefault();
      const insert = '\n' + indent + extra;
      edit(code.slice(0, s) + insert + code.slice(en));
      requestAnimationFrame(() => el.setSelectionRange(s + insert.length, s + insert.length));
    }
    if (e.key !== 'Escape') setEscapeTab(false);
  };

  const lines = code.split('\n').length;
  const showInput = READS_INPUT.test(code) || starterInput !== '';
  const canRun = availability === 'yes' && language !== 'html' && info.engine !== 'none';
  const online = ONLINE_COMPILERS[language];
  const diff = result && expected !== null && result.ok ? firstDifference(result.stdout, expected) : null;
  const matches = result && expected !== null && result.ok && sameOutput(result.stdout, expected);
  const edited = code !== starter;

  const btn = { className: 'lv-btn' } as const;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <span className="lv-badge" style={{ fontFamily: MONO }}>{String(config.filename ?? info.file)}</span>
        <span className="lv-label">{info.label}</span>
        <span className="lv-label" style={{ marginLeft: 'auto' }}>
          {info.engine === 'browser' ? 'Runs in your browser' : info.engine === 'server' ? (availability === 'yes' ? 'Runs on the Lumexa code runner' : availability === 'checking' ? 'Checking the code runner…' : 'Running is not set up for this language yet') : ''}
        </span>
      </div>

      <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, overflow: 'hidden' }}>
        <pre ref={gutter} aria-hidden style={{ margin: 0, padding: '10px 8px', fontFamily: MONO, fontSize: 13, lineHeight: '20px', color: C.muted, textAlign: 'right', userSelect: 'none', background: C.surface2, overflow: 'hidden', minWidth: 38 }}>
          {Array.from({ length: lines }, (_, i) => i + 1).join('\n')}
        </pre>
        <textarea
          aria-label={`${info.label} code. Press Escape and then Tab to leave the editor.`}
          value={code}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          rows={Math.min(Math.max(lines, 5), 26)}
          onChange={(e) => edit(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={(e) => {
            if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
          }}
          style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', resize: 'vertical', padding: '10px 12px', fontFamily: MONO, fontSize: 13, lineHeight: '20px', background: 'transparent', color: C.text, whiteSpace: 'pre', overflow: 'auto' }}
        />
      </div>

      {showInput && language !== 'html' && (
        <div style={{ marginTop: 8 }}>
          <label className="lv-label" htmlFor={`${id}-stdin`}>Input for the program (each line is one thing it reads)</label>
          <textarea id={`${id}-stdin`} value={stdin} onChange={(e) => setStdin(e.target.value)} rows={Math.min(Math.max(stdin.split('\n').length, 2), 6)} spellCheck={false} style={{ width: '100%', marginTop: 2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', fontFamily: MONO, fontSize: 13, background: C.surface, color: C.text }} />
        </div>
      )}

      <div className="lv-controls">
        {canRun && <button type="button" className="lv-btn lv-btn-primary" onClick={() => void run()} disabled={running}>{running ? 'Running…' : '▶ Run'}</button>}
        <button type="button" {...btn} onClick={() => { edit(starter); setResult(null); setStdin(starterInput); touch(); }} disabled={!edited && !result}>Reset</button>
        <button type="button" {...btn} onClick={() => { void navigator.clipboard?.writeText(code).catch(() => undefined); touch(); }}>Copy code</button>
        {canRun && <span className="lv-label">Ctrl + Enter runs the code</span>}
      </div>

      {escapeTab && <p className="lv-label" role="status">Tab now moves to the next control. Press any key in the editor to indent again.</p>}
      {status && <p className="lv-note" role="status">{status}</p>}

      {!canRun && availability === 'no' && info.engine === 'server' && (
        <p className="lv-note" role="note" style={{ borderLeft: `4px solid ${C.warn}`, paddingLeft: 10 }}>
          <strong>This lesson server cannot compile {info.label} yet,</strong> so there is no Run button here, and nothing is pretended. Copy the code and run it on your own computer (with a {info.label} compiler), or paste it into {online ? <a href={online.url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent2, textDecoration: 'underline' }}>{online.name}</a> : 'an online compiler'}. Your teacher can also run it for you in class.
        </p>
      )}

      {language === 'html' && (
        <div style={{ marginTop: 8 }}>
          <p className="lv-label" style={{ margin: '0 0 4px' }}>Live preview (it updates as you type)</p>
          <iframe title="Live preview of your page" sandbox="allow-scripts" srcDoc={previewCode} style={{ width: '100%', height: 260, border: `1px solid ${C.border}`, borderRadius: 10, background: '#fff' }} />
        </div>
      )}

      {result && (
        <div style={{ marginTop: 8 }} aria-live="polite">
          {result.tables && result.tables.length > 0 ? (
            result.tables.map((t, ti) => (
              <div key={ti} style={{ overflowX: 'auto', marginBottom: 8 }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr>{t.columns.map((c) => <th key={c} style={{ border: `1px solid ${C.border}`, background: C.surface2, padding: '3px 10px', textAlign: 'left' }}>{c}</th>)}</tr></thead>
                  <tbody>
                    {t.rows.map((r, ri) => (
                      <tr key={ri}>{r.map((v, ci) => <td key={ci} style={{ border: `1px solid ${C.border}`, padding: '3px 10px', fontFamily: MONO }}>{v === null ? <em style={{ color: C.muted }}>NULL</em> : String(v)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
                <p className="lv-label" style={{ margin: '2px 0 0' }}>{t.rows.length} row{t.rows.length === 1 ? '' : 's'}{t.truncated ? ' shown (the first 200)' : ''}</p>
              </div>
            ))
          ) : result.ok && language === 'sql' && !result.stdout ? (
            <p className="lv-note" style={{ margin: '0 0 6px' }}>The statements ran. They returned no rows{typeof result.changed === 'number' && result.changed > 0 ? ` (${result.changed} row${result.changed === 1 ? '' : 's'} changed)` : ''}. Add a SELECT to see the data.</p>
          ) : null}
          {(result.stdout || (!result.ok && !result.stderr) || (result.ok && language !== 'sql')) && (
            <>
              <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', color: C.muted, marginBottom: 3 }}>Output</div>
              <pre style={{ margin: 0, background: '#0f172a', color: '#e2e8f0', padding: '8px 12px', borderRadius: 8, fontSize: 13, overflowX: 'auto', minHeight: 36, whiteSpace: 'pre-wrap' }}>{result.stdout || (result.ok ? '(the program printed nothing)' : '')}</pre>
            </>
          )}
          {result.stderr && (
            <pre role="alert" style={{ margin: '6px 0 0', background: '#2a1215', color: '#fecaca', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{result.stderr}</pre>
          )}
          <p className="lv-label" style={{ margin: '4px 0 0' }}>{result.ok ? 'Finished' : result.limit ? 'Stopped' : 'Finished with an error'} in {result.timeMs} ms.</p>
          {expected !== null && result.ok && (
            matches ? (
              <p className="lv-note" role="status" style={{ color: C.good, fontWeight: 700 }}>✓ Your output matches the expected output.</p>
            ) : (
              <div className="lv-note" role="status">
                <strong style={{ color: C.bad }}>✗ Not the expected output yet.</strong>
                {diff && <> Line {diff.line}: you printed <code>{diff.got}</code> but the lesson expects <code>{diff.want}</code>.</>}
              </div>
            )
          )}
        </div>
      )}

      {hint && <details style={{ marginTop: 6 }}><summary className="lv-label" style={{ cursor: 'pointer' }}>Need a hint?</summary><p className="lv-note">{hint}</p></details>}
      {expected !== null && !result && <details style={{ marginTop: 6 }}><summary className="lv-label" style={{ cursor: 'pointer' }}>What output should I get?</summary><pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '8px 12px', borderRadius: 8, fontSize: 13, overflowX: 'auto' }}>{expected}</pre></details>}
    </div>
  );
}

registerVisuals({
  'code-lab': { Component: CodeLab, interactive: true, role: 'group' },
});
