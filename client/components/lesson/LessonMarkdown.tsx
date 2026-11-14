'use client';

// FILE PATH: client/components/lesson/LessonMarkdown.tsx
//
// The lesson content renderer (replaces the old hand-rolled SimpleMarkdown).
//
// react-markdown + GFM, with custom components for everything a lesson uses:
//   * H1–H4 as a proper hierarchy (a stray H1 becomes H2 — the page title is the H1),
//     each heading carrying a stable id for the table of contents;
//   * semantic lists, blockquotes, dividers, bold/italic, inline code;
//   * syntax-highlighted fenced code (independently scrollable, with copy);
//   * GFM tables inside a horizontally scrolling wrapper;
//   * links: external ones open safely in a new tab, internal ones are routed, and
//     "Lesson N" references resolve through the server (never to a locked lesson);
//   * images with alt text and a caption, lazy-loaded, from https or this app only;
//   * callouts (`> [!TIP]`), and the lumexa-visual / lumexa-quiz blocks.
//
// Safety: raw HTML is NOT enabled, so `<header>` or `<img src=x onerror=…>` in the
// text is shown literally, never executed or silently dropped; link and media
// addresses go through allowlists (lib/lesson/markdown.ts).

import { Children, isValidElement, memo, type ReactNode } from 'react';
import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import lua from 'highlight.js/lib/languages/lua';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import diff from 'highlight.js/lib/languages/diff';
import plaintext from 'highlight.js/lib/languages/plaintext';
import remarkCallouts from '@/lib/lesson/remarkCallouts';
import { QUIZ_BLOCK_LANG, VISUAL_BLOCK_LANG, refKeyFromHref, safeMediaSrc, safeUrl } from '@/lib/lesson/markdown';
import CodeBlock from './CodeBlock';
import Callout from './Callout';
import { useLessonRender } from './LessonContext';
import VisualBlock from './visuals/VisualBlock';

// Only the languages lessons use: keeps the highlighter small.
const LANGUAGES = { python, javascript, typescript, xml, css, bash, json, lua, java, c, cpp, sql, markdown, diff, plaintext };
const REHYPE: [typeof rehypeHighlight, Parameters<typeof rehypeHighlight>[0]][] = [
  [rehypeHighlight, { languages: LANGUAGES, detect: false, aliases: { bash: ['terminal', 'console'], plaintext: ['output', 'input', 'txt', 'asm', 'assembly'], lua: ['luau'], c: ['h'], cpp: ['c++', 'cc', 'cxx', 'hpp'] } }],
];
const REMARK = [remarkGfm, remarkCallouts];

// A hast (HTML AST) node, as react-markdown hands it to a component.
interface HNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
  position?: { start: { line: number } };
}

function hastText(n: HNode | undefined): string {
  if (!n) return '';
  if (n.type === 'text') return n.value ?? '';
  return (n.children ?? []).map(hastText).join('');
}

function LessonRef({ refKey, children }: { refKey: string; children: ReactNode }) {
  const { refs } = useLessonRender();
  const target = refs[refKey];
  if (!target || target.current) return <span className="lesson-ref-plain">{children}</span>;
  if (target.locked) {
    return (
      <span className="lesson-ref-locked" title="This lesson unlocks after you have had that class.">
        {children}
        <span aria-hidden="true"> 🔒</span>
        <span className="sr-only"> (locked until that class is completed)</span>
      </span>
    );
  }
  if (!target.href) return <span className="lesson-ref-plain">{children}</span>;
  return (
    <Link href={target.href} className="lesson-ref" title={`${target.lessonIndex ? `Lesson ${target.lessonIndex}: ` : ''}${target.title}`}>
      {children}
    </Link>
  );
}

function slugFor(headingIds: Map<number, string> | undefined, node: HNode | undefined, lineOffset: number): string | undefined {
  const line = node?.position?.start.line;
  return headingIds && line !== undefined ? headingIds.get(lineOffset + line - 1) : undefined;
}

function buildComponents(headingIds: Map<number, string> | undefined, lineOffset: number): Components {
  const heading = (Tag: 'h2' | 'h3' | 'h4') =>
    function Heading({ node, children }: { node?: HNode; children?: ReactNode }) {
      const id = slugFor(headingIds, node, lineOffset);
      return (
        <Tag id={id} className={`lesson-${Tag}`}>
          {children}
          {id && (
            <a href={`#${id}`} className="lesson-anchor" aria-label="Link to this section">
              #
            </a>
          )}
        </Tag>
      );
    };

  return {
    // The page's own title is the only H1.
    h1: heading('h2') as Components['h1'],
    h2: heading('h2') as Components['h2'],
    h3: heading('h3') as Components['h3'],
    h4: heading('h4') as Components['h4'],
    h5: heading('h4') as Components['h5'],
    h6: heading('h4') as Components['h6'],

    p({ node, children }) {
      // A paragraph holding only an image is a figure: no <p> around it.
      const kids = ((node as HNode | undefined)?.children ?? []).filter((k) => !(k.type === 'text' && !(k.value ?? '').trim()));
      if (kids.length === 1 && kids[0].type === 'element' && kids[0].tagName === 'img') return <>{children}</>;
      return <p>{children}</p>;
    },

    a({ href, children }) {
      const key = refKeyFromHref(href);
      if (key) return <LessonRef refKey={key}>{children}</LessonRef>;
      const url = safeUrl(href);
      if (!url) return <span>{children}</span>;
      if (url.startsWith('#')) return <a href={url}>{children}</a>;
      if (url.startsWith('/')) return <Link href={url}>{children}</Link>;
      if (url.startsWith('mailto:')) return <a href={url}>{children}</a>;
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {children}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    },

    img({ src, alt, title }) {
      const source = safeMediaSrc(typeof src === 'string' ? src : '');
      if (!source) {
        // Never load an address we do not trust; keep what the picture said.
        return alt ? <span className="lesson-img-missing">[{alt}]</span> : null;
      }
      return (
        <figure className="lesson-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={source} alt={alt ?? ''} loading="lazy" decoding="async" />
          {title && <figcaption>{title}</figcaption>}
        </figure>
      );
    },

    table({ children }) {
      return (
        <div className="lesson-table-wrap" role="region" aria-label="Table" tabIndex={0}>
          <table>{children}</table>
        </div>
      );
    },

    blockquote({ children }) {
      return <blockquote>{children}</blockquote>;
    },

    aside(props) {
      const kind = String((props as Record<string, unknown>)['data-callout'] ?? 'note');
      return <Callout kind={kind}>{props.children}</Callout>;
    },

    hr() {
      return <hr className="lesson-hr" />;
    },

    input({ type, checked }) {
      // GFM task lists: shown, never editable.
      return type === 'checkbox' ? <input type="checkbox" checked={!!checked} readOnly disabled className="lesson-task" aria-label={checked ? 'Done' : 'To do'} /> : null;
    },

    code({ className, children }) {
      return <code className={className ? className : 'lesson-inline-code'}>{children}</code>;
    },

    pre({ node, children }) {
      const codeEl = ((node as HNode | undefined)?.children ?? []).find((c) => c.tagName === 'code');
      const classes = (codeEl?.properties?.className as string[] | string | undefined) ?? [];
      const list = Array.isArray(classes) ? classes : String(classes).split(/\s+/);
      const lang = (list.find((c) => c.startsWith('language-')) ?? '').slice('language-'.length);
      const text = hastText(codeEl).replace(/\n$/, '');

      if (lang === VISUAL_BLOCK_LANG) return <VisualBlock id={text.trim()} />;
      if (lang === QUIZ_BLOCK_LANG) return <QuizSlot />;

      // The rendered <code> element holds the highlighted spans; reuse its children.
      const first = Children.toArray(children)[0];
      const inner = isValidElement(first) ? (first.props as { children?: ReactNode }).children : children;
      return (
        <CodeBlock lang={lang} code={text}>
          <code className={`hljs${lang ? ` language-${lang}` : ''}`}>{inner}</code>
        </CodeBlock>
      );
    },
  };
}

function QuizSlot() {
  const { renderQuiz } = useLessonRender();
  return <>{renderQuiz ? renderQuiz() : null}</>;
}

export interface LessonMarkdownProps {
  markdown: string;
  /** Line (in the whole lesson) at which this markdown starts, for heading ids. */
  lineOffset?: number;
  /** Heading ids by (zero-based, whole-lesson) line — see extractHeadings. */
  headingIds?: Map<number, string>;
  className?: string;
}

function LessonMarkdownImpl({ markdown, lineOffset = 0, headingIds, className }: LessonMarkdownProps) {
  return (
    <div className={`lesson-prose${className ? ` ${className}` : ''}`}>
      <ReactMarkdown
        remarkPlugins={REMARK}
        rehypePlugins={REHYPE}
        urlTransform={(url) => safeUrl(url)}
        components={buildComponents(headingIds, lineOffset)}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export default memo(LessonMarkdownImpl);
