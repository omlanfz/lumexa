// FILE PATH: client/lib/classroom/linkify.ts
//
// Finds the links in a chat message so they can be shown as real, clickable links.
// Pure (no React, no DOM), so the rules can be tested on their own.
//
// What counts as a link — deliberately conservative, because a chat is mostly
// ordinary sentences and a wrong link is worse than a missed one:
//   - anything that starts with http:// or https://
//   - anything that starts with www.
//   - a bare address like `github.com/lumexa` or `meet.google.com/abc-defg-hij`,
//     but only when it ends in one of a few common, unambiguous endings (BARE_TLDS)
//     and is written in lower case — so `main.py`, `index.html`, `e.g.` and a
//     sentence missing its space ("Done.Me too") are left alone.
// Email addresses are never links. The result only ever contains http(s) URLs
// (checked by actually parsing them), so a message can never produce a
// `javascript:` or other odd link.

export type TextPart =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string; href: string };

/** Endings accepted on an address typed without http:// or www. */
const BARE_TLDS = new Set([
  'com',
  'org',
  'net',
  'edu',
  'gov',
  'io',
  'dev',
  'app',
  'info',
  'xyz',
  'site',
  'online',
  'tech',
  'bd',
]);

// Not preceded by a letter/digit/underscore, `@`, `/`, `.` or `-` (so never in the
// middle of a word, an email address or a path); an optional scheme; dotted host
// labels ending in letters; an optional port; an optional path/query/fragment.
const CANDIDATE =
  /(?<![\w@/.-])((?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}(?::\d{1,5})?(?:[/?#][^\s<>"]*)?)/gi;

const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

/** The link without punctuation that belongs to the sentence around it:
 * "see https://a.com/x." → "https://a.com/x"; a closing bracket stays only when
 * the link itself has the opening one ("…/wiki/Foo_(bar)"). */
function trimTrailing(url: string): string {
  let end = url.length;
  while (end > 0) {
    const ch = url[end - 1];
    if ('.,;:!?\'"*_~'.includes(ch)) {
      end--;
      continue;
    }
    const opener = CLOSERS[ch];
    if (opener) {
      const body = url.slice(0, end);
      const opens = body.split(opener).length - 1;
      const closes = body.split(ch).length - 1;
      if (closes > opens) {
        end--;
        continue;
      }
    }
    break;
  }
  return url.slice(0, end);
}

/** The address to open for `shown`, or null when it is not a link we accept. */
function hrefFor(shown: string): string | null {
  const hasScheme = /^https?:\/\//i.test(shown);
  if (!hasScheme && !/^www\./i.test(shown)) {
    // Typed without http:// or www.: only the safe, common endings, in lower case.
    const host = shown.split(/[/?#:]/, 1)[0];
    const tld = host.slice(host.lastIndexOf('.') + 1);
    if (tld !== tld.toLowerCase() || !BARE_TLDS.has(tld)) return null;
  }
  const href = hasScheme ? shown : `https://${shown}`;
  try {
    const url = new URL(href);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** The message split into plain text and links, in order. Joining the `text` of
 * every part gives back the original message exactly. */
export function linkify(message: string): TextPart[] {
  const parts: TextPart[] = [];
  let cursor = 0;
  const push = (text: string) => {
    if (!text) return;
    const last = parts[parts.length - 1];
    if (last && last.type === 'text') last.text += text;
    else parts.push({ type: 'text', text });
  };

  for (const match of message.matchAll(CANDIDATE)) {
    const start = match.index;
    const shown = trimTrailing(match[1]);
    const href = hrefFor(shown);
    if (!href) continue;
    push(message.slice(cursor, start));
    parts.push({ type: 'link', text: shown, href });
    cursor = start + shown.length;
  }
  push(message.slice(cursor));
  return parts;
}
