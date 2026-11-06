// FILE PATH: client/lib/lesson/remarkCallouts.ts
//
// Educational callouts written the GitHub-alert way, which degrades to an ordinary
// blockquote in any other Markdown viewer:
//
//     > [!TIP]
//     > Press Tab to indent a whole block.
//
// This remark plugin turns such a blockquote into an <aside data-callout="tip"> and
// removes the marker. Written without a tree-walking dependency (the tree is tiny).

export const CALLOUT_TYPES = ['tip', 'note', 'warning', 'example', 'takeaway', 'mistake', 'important'] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: Record<string, unknown>;
}

function transformBlockquote(bq: MdNode): void {
  const first = bq.children?.[0];
  if (!first || first.type !== 'paragraph') return;
  const text = first.children?.[0];
  if (!text || text.type !== 'text' || typeof text.value !== 'string') return;
  const m = text.value.match(/^\s*\[!([A-Za-z]+)\][ \t]*(?:\r?\n)?/);
  if (!m) return;
  const kind = m[1].toLowerCase();
  if (!(CALLOUT_TYPES as readonly string[]).includes(kind)) return;
  text.value = text.value.slice(m[0].length);
  if (text.value === '') {
    first.children!.shift();
    if (first.children!.length === 0) bq.children!.shift();
  }
  bq.data = { ...(bq.data ?? {}), hName: 'aside', hProperties: { 'data-callout': kind } };
}

function walk(node: MdNode): void {
  if (!node.children) return;
  for (const child of node.children) {
    if (child.type === 'blockquote') transformBlockquote(child);
    walk(child);
  }
}

export default function remarkCallouts() {
  return (tree: MdNode) => walk(tree);
}
