// FILE PATH: client/lib/assessment/lcPractical.ts
//
// Small pure rules of the Little Coders practical hand-in, shared by the screen and its tests. They
// mirror what the server enforces (server/src/little-coders/assessments/lc-attempt.ts and
// server/src/assessments/assessment-files.service.ts) so a student hears about a problem right away
// instead of after an upload — the server still checks everything again.

export const PROJECT_EXTENSIONS = ['sb3', 'sb2', 'py', 'txt', 'md', 'json', 'zip', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'];

/** A full https:// address (the only kind a project link may be). */
export function isHttps(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 500 || /\s/.test(v)) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !!u.hostname;
  } catch {
    return false;
  }
}

/** The links worth sending: trimmed, valid, without repeats, at most `max`. */
export function cleanLinks(links: string[], max = 5): string[] {
  const out: string[] = [];
  for (const raw of links) {
    const l = raw.trim();
    if (l && isHttps(l) && !out.includes(l)) out.push(l);
  }
  return out.slice(0, max);
}

export const extensionOf = (name: string) => (name.includes('.') ? (name.split('.').pop() ?? '').toLowerCase() : '');

/**
 * What is wrong with the files a student picked, in plain words — or null when they can all be uploaded.
 * `existing` is how many files they already have; one bad file stops the whole batch (nothing is half-uploaded).
 */
export function checkSelectedFiles(files: { name: string; size: number }[], opts: { existing: number; maxFiles: number; maxFileMb: number; allowed?: string[] }): string | null {
  const allowed = opts.allowed ?? PROJECT_EXTENSIONS;
  if (files.length === 0) return null;
  if (opts.existing + files.length > opts.maxFiles) {
    const room = Math.max(0, opts.maxFiles - opts.existing);
    return room === 0 ? `You have added the most files you can (${opts.maxFiles}). Remove one first.` : `You can add ${room} more file${room === 1 ? '' : 's'} (up to ${opts.maxFiles} in all).`;
  }
  for (const f of files) {
    const ext = extensionOf(f.name);
    if (!allowed.includes(ext)) return `“${f.name}” can't be handed in. You can use ${allowed.map((e) => `.${e}`).join(', ')}.`;
    if (f.size === 0) return `“${f.name}” is empty.`;
    if (f.size > opts.maxFileMb * 1024 * 1024) return `“${f.name}” is bigger than ${opts.maxFileMb} MB.`;
  }
  return null;
}
