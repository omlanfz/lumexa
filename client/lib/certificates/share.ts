// FILE PATH: client/lib/certificates/share.ts
//
// Everything about SHARING a certificate that does not need React: the
// pre-written message, the share links, the Web Share API wrapper and the
// clipboard helper. Kept pure (browser objects are passed in) so it is tested.
//
// The link that is shared is always the certificate's verification URL as the
// SERVER built it from FRONTEND_URL (StudentCertificate.verificationUrl). No
// address is written in this file, and when the server has none (FRONTEND_URL
// not configured) there is nothing to share — the UI disables sharing instead of
// inventing a link.
//
// What each platform really allows (so the UI never over-promises):
//   • WhatsApp   — wa.me opens a chat picker with the message filled in.
//   • Facebook   — the sharer takes the link; it may ignore extra text.
//   • LinkedIn   — the share-offsite page takes only the link.
//   • Discord    — has no web share URL. We copy the message and open Discord.
//   • Instagram  — cannot be posted to from a website. We save the image and
//                  explain the manual upload.
//   • Native     — the Web Share API (phones, some desktops), with the PNG
//                  attached where the browser allows files.

/** The message the student can copy or share. [Program Name] and
 * [Certificate URL] are replaced with the real values. */
export const SHARE_MESSAGE_TEMPLATE =
  "🎉 I did it! I've successfully completed the [Program Name] at Lumexa AI School! 🚀💻\n" +
  "I'm so excited to share what I've learned and the projects I've created. Can't wait for my next learning adventure! 🌟\n" +
  'Check out and verify my certificate here: [Certificate URL]';

const PROGRAM_PLACEHOLDER = '[Program Name]';
const URL_PLACEHOLDER = '[Certificate URL]';

/** Fills the template. Uses split/join (not String.replace) so a programme name
 * containing "$&" or similar can never be interpreted as a replacement pattern. */
export function buildShareMessage(
  programName: string,
  certificateUrl: string,
): string {
  return SHARE_MESSAGE_TEMPLATE.split(PROGRAM_PLACEHOLDER)
    .join(programName)
    .split(URL_PLACEHOLDER)
    .join(certificateUrl);
}

/** The message without its final "verify here" link line — for platforms that
 * show the link separately (a Facebook post's quote). */
export function buildShareMessageWithoutLink(programName: string): string {
  const lines = SHARE_MESSAGE_TEMPLATE.split(PROGRAM_PLACEHOLDER)
    .join(programName)
    .split('\n');
  return lines.slice(0, -1).join('\n');
}

// ─── Share links ─────────────────────────────────────────────────────────────

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function facebookShareUrl(
  certificateUrl: string,
  quote: string,
): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(certificateUrl)}&quote=${encodeURIComponent(quote)}`;
}

export function linkedinShareUrl(certificateUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certificateUrl)}`;
}

/** Discord has no share URL, so we never build one: we open the app/web client
 * itself and the student pastes the copied message. */
export const DISCORD_OPEN_URL = 'https://discord.com/app';

export const INSTAGRAM_STEPS = [
  'Save your certificate image (we just downloaded it).',
  'Open Instagram and tap + to start a new post or story.',
  'Choose the saved image from your photos and share it.',
  'Optional: paste the verification link in your caption or bio so anyone can check it.',
];

export const INSTAGRAM_NOTE =
  'Instagram does not let websites post for you, so this part is done by hand in the Instagram app.';

// ─── Web Share API ───────────────────────────────────────────────────────────

/** The slice of `navigator` these helpers use (so tests can pass a fake). */
export interface ShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

export type NativeShareResult =
  | 'shared'
  | 'cancelled'
  | 'unsupported'
  | 'failed';

export function canShareNatively(nav: ShareNavigator | undefined): boolean {
  return typeof nav?.share === 'function';
}

/** Opens the device's share sheet with the message (which already contains the
 * link) and, when the browser can share files, the certificate image too. */
export async function shareNatively(
  nav: ShareNavigator | undefined,
  data: { title: string; text: string; file?: File | null },
): Promise<NativeShareResult> {
  if (!nav || typeof nav.share !== 'function') return 'unsupported';
  const base: ShareData = { title: data.title, text: data.text };
  const withFile: ShareData | null = data.file
    ? { ...base, files: [data.file] }
    : null;
  const payload =
    withFile && nav.canShare?.(withFile) === true ? withFile : base;
  try {
    await nav.share(payload);
    return 'shared';
  } catch (err) {
    // Closing the share sheet is not an error.
    return (err as { name?: string } | null)?.name === 'AbortError'
      ? 'cancelled'
      : 'failed';
  }
}

// ─── Clipboard ───────────────────────────────────────────────────────────────

/** Copies text. Uses the async Clipboard API where available (secure contexts)
 * and a hidden-textarea fallback elsewhere. Resolves false if neither worked. */
export async function copyText(
  text: string,
  nav: ShareNavigator | undefined,
  legacyCopy?: (text: string) => boolean,
): Promise<boolean> {
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path (permission denied, insecure context…)
    }
  }
  try {
    return legacyCopy ? legacyCopy(text) : false;
  } catch {
    return false;
  }
}

/** The textarea + execCommand fallback, for browsers/contexts without the async
 * Clipboard API. Browser-only; passed to copyText() by the UI. */
export function legacyCopyViaTextarea(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(area);
  }
}
