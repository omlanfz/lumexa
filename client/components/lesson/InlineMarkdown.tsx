'use client';

// FILE PATH: client/components/lesson/InlineMarkdown.tsx
//
// Inline Markdown only (bold, italic, `code`, strike-through) for short strings —
// quiz prompts and answer options. Block syntax is flattened, links are inert, and
// raw HTML is never rendered.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ALLOWED = ['p', 'strong', 'em', 'code', 'del', 'br'];

export default function InlineMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      allowedElements={ALLOWED}
      unwrapDisallowed
      urlTransform={() => ''}
      components={{
        p: ({ children }) => <>{children}</>,
        code: ({ children }) => <code className="lesson-inline-code">{children}</code>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
