'use client';

// FILE PATH: client/components/lesson/CodeBlock.tsx
//
// A fenced code block as the lesson shows it: language label, copy button, and a
// body that scrolls on its own (sideways for long lines, vertically past a
// reasonable height) so a long example never stretches the page or the classroom.
// The body is keyboard-focusable so it can be scrolled without a mouse.

import type { ReactNode } from 'react';
import CopyCodeButton from '@/components/curriculum/CopyCodeButton';

const LABELS: Record<string, string> = {
  py: 'Python', python: 'Python', ipython: 'Python',
  js: 'JavaScript', javascript: 'JavaScript', jsx: 'JSX', ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX',
  html: 'HTML', xml: 'HTML', css: 'CSS',
  bash: 'Terminal', sh: 'Terminal', shell: 'Terminal', zsh: 'Terminal', terminal: 'Terminal',
  json: 'JSON', lua: 'Lua', luau: 'Lua', java: 'Java', sql: 'SQL', md: 'Markdown', markdown: 'Markdown', diff: 'Diff',
  c: 'C', h: 'C', cpp: 'C++', 'c++': 'C++', cc: 'C++', cxx: 'C++', hpp: 'C++', asm: 'Assembly', assembly: 'Assembly',
  text: 'Output', txt: 'Output', plaintext: 'Output', output: 'Output', input: 'Input',
};

export function languageLabel(lang: string): string {
  return LABELS[lang.toLowerCase()] ?? (lang ? lang : 'Code');
}

export default function CodeBlock({ lang, code, children }: { lang: string; code: string; children: ReactNode }) {
  const label = languageLabel(lang);
  return (
    <figure className="lesson-code not-prose">
      <div className="lesson-code-bar">
        <span className="lesson-code-lang">{label}</span>
        <CopyCodeButton code={code} />
      </div>
      <pre tabIndex={0} aria-label={`${label} code`} className="lesson-pre">
        {children}
      </pre>
    </figure>
  );
}
