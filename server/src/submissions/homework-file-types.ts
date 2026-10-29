// FILE PATH: server/src/submissions/homework-file-types.ts
//
// What a homework file may be, and how a teacher gets to see it. Validation is by
// file EXTENSION (browsers and operating systems report generic or wrong mime
// types for code files, so a mime allow-list would turn legitimate work away);
// the type we store and serve is always the one the extension implies, never the
// one the browser claimed. Pure, so every rule can be unit tested.
//
// How each kind is shown (see HomeworkFilesService):
//   SOURCE    shown as text in Lumexa's own viewer page — code, markup and plain
//             text, HTML included, is only ever DISPLAYED, never run
//   NOTEBOOK  .ipynb, previewed cell by cell in the same viewer
//   PDF       opened in the browser's PDF viewer (from a short-lived signed URL)
//   IMAGE     opened in the browser (the same way)
//   DOWNLOAD  everything else (.sb3, .rbxl, Word, ZIP, …): downloads normally

export const HOMEWORK_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const HOMEWORK_MAX_FILES_PER_UPLOAD = 10;
export const HOMEWORK_MAX_TOTAL_BYTES = 60 * 1024 * 1024;

export type HomeworkViewKind =
  | 'SOURCE'
  | 'NOTEBOOK'
  | 'PDF'
  | 'IMAGE'
  | 'DOWNLOAD';

const SOURCE_EXTENSIONS = [
  'txt',
  'md',
  'csv',
  'json',
  'xml',
  'sql',
  'sh',
  'yml',
  'yaml',
  'py',
  'js',
  'jsx',
  'ts',
  'tsx',
  'java',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'php',
  'rb',
  'go',
  'rs',
  'swift',
  'kt',
  'kts',
  'lua',
  'r',
  'pl',
  'scala',
  'dart',
  'vue',
  'svelte',
  'html',
  'htm',
  'css',
  'scss',
];

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const DOWNLOAD_EXTENSIONS = [
  'doc',
  'docx',
  'rtf',
  'odt',
  'zip',
  'rar',
  '7z',
  'heic',
  'heif',
  'sb3',
  'sb2',
  'rbxl',
  'rbxlx',
];

const KIND_BY_EXTENSION = new Map<string, HomeworkViewKind>([
  ...SOURCE_EXTENSIONS.map((e) => [e, 'SOURCE'] as const),
  ['ipynb', 'NOTEBOOK'],
  ['pdf', 'PDF'],
  ...IMAGE_EXTENSIONS.map((e) => [e, 'IMAGE'] as const),
  ...DOWNLOAD_EXTENSIONS.map((e) => [e, 'DOWNLOAD'] as const),
]);

export const HOMEWORK_ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set(
  KIND_BY_EXTENSION.keys(),
);

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  rtf: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
  ipynb: 'application/json',
  sb3: 'application/x-scratch3',
  sb2: 'application/x-scratch2',
};

/** The lower-case extension of a file name ('' when it has none). */
export function extensionOf(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot > 0 || (dot === 0 && base.length > 1)
    ? base.slice(dot + 1).toLowerCase()
    : '';
}

export function isAllowedHomeworkFile(fileName: string): boolean {
  return HOMEWORK_ALLOWED_EXTENSIONS.has(extensionOf(fileName));
}

export function viewKindFor(fileName: string): HomeworkViewKind {
  return KIND_BY_EXTENSION.get(extensionOf(fileName)) ?? 'DOWNLOAD';
}

/** The content type recorded for a file — from its extension, not the browser. */
export function contentTypeFor(fileName: string): string {
  const ext = extensionOf(fileName);
  if (CONTENT_TYPE_BY_EXTENSION[ext]) return CONTENT_TYPE_BY_EXTENSION[ext];
  return viewKindFor(fileName) === 'SOURCE'
    ? 'text/plain; charset=utf-8'
    : 'application/octet-stream';
}

/** A name that is safe to keep: no path, no control or odd characters, never empty. */
export function safeFileName(fileName: string): string {
  const base = (fileName.split(/[\\/]/).pop() ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f"<>|:*?]/g, '_')
    .trim();
  const clipped = base.length > 150 ? base.slice(-150) : base;
  return clipped.replace(/^\.+$/, '') || 'file';
}

/** The ASCII-only form of a name, for the `filename=` fallback of a download. */
export function asciiFileName(fileName: string): string {
  return safeFileName(fileName)
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/[\\"]/g, '_');
}

/**
 * Files a browser will DISPLAY (PDF, images) must really be that: a file named
 * .pdf that is something else is refused, so a disguised file can never be served
 * as a document. Returns null when fine, or a reason. Other kinds are not checked
 * (they are shown as text or downloaded, never interpreted).
 */
export function signatureProblem(
  fileName: string,
  bytes: Uint8Array,
): string | null {
  const ext = extensionOf(fileName);
  const at = (i: number) => bytes[i];
  const text = (from: number, s: string) =>
    [...s].every((c, i) => at(from + i) === c.charCodeAt(0));
  const bad = `"${safeFileName(fileName)}" is not a real .${ext} file.`;
  switch (ext) {
    case 'pdf':
      // The header may follow a few stray bytes.
      return Buffer.from(bytes.subarray(0, 1024)).includes('%PDF-')
        ? null
        : bad;
    case 'png':
      return bytes.length >= 8 && at(0) === 0x89 && text(1, 'PNG') ? null : bad;
    case 'jpg':
    case 'jpeg':
      return bytes.length >= 3 &&
        at(0) === 0xff &&
        at(1) === 0xd8 &&
        at(2) === 0xff
        ? null
        : bad;
    case 'gif':
      return text(0, 'GIF8') ? null : bad;
    case 'webp':
      return bytes.length >= 12 && text(0, 'RIFF') && text(8, 'WEBP')
        ? null
        : bad;
    default:
      return null;
  }
}

/** True when the bytes look like text (no NUL byte near the start). */
export function looksLikeText(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 8192);
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return false;
  return true;
}
