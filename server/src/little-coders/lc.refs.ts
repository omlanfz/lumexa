// FILE PATH: server/src/little-coders/lc.refs.ts
//
// The bookkeeping a Little Coders lesson row keeps in Lesson.sourceRefs.lcV2: which authored lesson
// it came from, which authoring version wrote it, and which of its fields an admin has edited since
// (those are never refreshed from the authored curriculum again).

/** Fields an admin can edit that a refresh must then leave alone. */
export type LcEditableField =
  | 'title'
  | 'objectives'
  | 'contentMarkdown'
  | 'homework'
  | 'teacherNotes'
  | 'checkpoint'
  | 'codeSnippets'
  | 'experience'
  | 'previewVideo'
  | 'projectCard'
  | 'homeworkCard';

export interface LcSourceRefs {
  lcV2?: { key: string; version: number; edited: LcEditableField[] };
  legacyLittleCodersV1?: unknown;
  [k: string]: unknown;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

export function readLcRefs(
  sourceRefs: unknown,
): NonNullable<LcSourceRefs['lcV2']> | null {
  if (!isObj(sourceRefs) || !isObj(sourceRefs.lcV2)) return null;
  const v = sourceRefs.lcV2;
  return {
    key: typeof v.key === 'string' ? v.key : '',
    version: typeof v.version === 'number' ? v.version : 0,
    edited: Array.isArray(v.edited)
      ? (v.edited.filter((x) => typeof x === 'string') as LcEditableField[])
      : [],
  };
}
