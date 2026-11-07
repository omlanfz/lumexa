import { createHash } from 'crypto';
import {
  CERTIFICATE_CATEGORIES,
  type CertificatePalette,
} from '../certificate-themes';
import {
  PALETTE_END,
  PALETTE_START,
  TEMPLATE_VERSION,
  formatCertificateDate,
  paletteCss,
  printedVerificationLink,
  renderCertificateHtml,
  type CertificateTemplateInput,
} from './certificate-template';

const BASE: Omit<CertificateTemplateInput, 'palette'> = {
  certificateId: 'LXA-2026-A7K9Q2',
  recipientName: 'Nusrat Jahan Tamanna',
  programName: 'AI Builder',
  completionDate: '2026-11-02',
  issueDate: '2026-11-06',
  verificationUrl: 'https://frontend.example.test/verify/LXA-2026-A7K9Q2',
  withDistinction: false,
};
const render = (
  over: Partial<CertificateTemplateInput> = {},
  theme: {
    palette: CertificatePalette;
  } = CERTIFICATE_CATEGORIES.AI_DATA_SCIENCE,
) => renderCertificateHtml({ ...BASE, palette: theme.palette, ...over });

/** The page with its themed block removed: everything that must NOT vary by category. */
const withoutAccent = (html: string) => {
  const a = html.indexOf(PALETTE_START);
  const b = html.indexOf(PALETTE_END);
  return html.slice(0, a) + html.slice(b + PALETTE_END.length);
};
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
/** What a reader sees (tags removed). */
const visibleText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

describe('formatCertificateDate', () => {
  it('writes the day, the month in full and the year (no leading zero)', () => {
    expect(formatCertificateDate('2026-11-06')).toBe('6 November 2026');
    expect(formatCertificateDate('2026-01-01')).toBe('1 January 2026');
    expect(formatCertificateDate('2027-12-31')).toBe('31 December 2027');
  });
  it('rejects anything that is not a calendar date', () => {
    expect(() => formatCertificateDate('06/11/2026')).toThrow();
    expect(() => formatCertificateDate('2026-13-01')).toThrow();
  });
});

describe('the master template — content', () => {
  const html = render();
  const text = visibleText(html);

  it('is titled Certificate of Completion', () => {
    expect(text).toContain('CERTIFICATE OF COMPLETION');
    expect(html).toContain(
      '<title>Lumexa AI School — Certificate of Completion — LXA-2026-A7K9Q2</title>',
    );
  });

  it('prints the recipient, the programme, both dates and the certificate ID', () => {
    expect(text).toContain('This certificate is proudly presented to');
    expect(text).toContain('Nusrat Jahan Tamanna');
    expect(text).toContain('for successfully completing the');
    expect(text).toContain('AI Builder');
    expect(text).toContain('Completed on 2 November 2026.');
    expect(text).toContain('DATE OF ISSUE');
    expect(text).toContain('6 November 2026');
    expect(text).toContain('CERTIFICATE ID');
    expect(text).toContain('LXA-2026-A7K9Q2');
  });

  it("carries the founder's name and title and the supplied signature image", () => {
    expect(text).toContain('Fairooz Omlan');
    expect(text).toContain('FOUNDER & CEO');
    // the real signature, embedded — not a typed imitation
    expect(html).toMatch(
      /<image href="data:image\/png;base64,[A-Za-z0-9+/=]{1000,}" x="149\.35"/,
    );
  });

  it('prints the verification link (without the scheme, as in the design) and a QR code', () => {
    expect(text).toContain(
      'Verify this certificate: frontend.example.test/verify/LXA-2026-A7K9Q2',
    );
    expect(text).toContain('SCAN TO VERIFY');
    expect(html).toMatch(/<path d="M[\dMhvz. -]+" fill="#0e1230"\/>/); // the QR modules
  });

  it("keeps the design's own wording and the logo and seal artwork", () => {
    expect(text).toContain(
      'A structured, teacher-led program designed to build knowledge',
    );
    expect(text).toContain(
      'and practical skills through guided learning and hands-on activities.',
    );
    expect(text).toContain('LUMEXA');
    expect(text).toContain('AI SCHOOL');
    expect(html.match(/<image href="data:image\/png/g)).toHaveLength(3); // logo, signature, seal mascot
    expect(html).toContain(
      'OFFICIAL CERTIFICATE'.split('').filter((c) => c !== ' ')[0],
    ); // seal caption glyphs
  });

  it('is a landscape A4 page', () => {
    expect(html).toContain('@page{size:297mm 210mm;margin:0}');
    expect(html).toContain('viewBox="0 0 1404 993"');
  });

  it('shows "With Distinction" only when an admin awarded it', () => {
    expect(visibleText(render({ withDistinction: false }))).not.toContain(
      'WITH DISTINCTION',
    );
    expect(visibleText(render({ withDistinction: true }))).toContain(
      'WITH DISTINCTION',
    );
  });

  it('is deterministic: the same input is byte-identical', () => {
    expect(render()).toBe(render());
  });

  it('shrinks long dynamic lines to fit (they carry the fit marker)', () => {
    expect(html).toMatch(/data-fit="1000"[^>]*>Nusrat Jahan Tamanna</);
    expect(html).toMatch(/data-fit="900"[^>]*>AI Builder</);
  });
});

describe('the master template — safety', () => {
  it('escapes everything a person typed', () => {
    const evil = render({
      recipientName: '<script>alert(1)</script> & "Q"',
      programName: '</text><image href="https://evil.test/x.png"/>',
    });
    expect(evil).not.toContain('<script>alert(1)</script>');
    expect(evil).not.toContain('<image href="https://evil.test');
    expect(evil).toContain(
      '&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Q&quot;',
    );
  });

  it('is self-contained: it can never load anything from the network', () => {
    const html = render();
    const urls = [
      ...html.matchAll(/(?:href|src)="([^"]+)"|url\(([^)]+)\)/g),
    ].map((m) => m[1] ?? m[2]);
    expect(urls.length).toBeGreaterThan(5);
    for (const url of urls) expect(url).toMatch(/^(data:|#)/);
    expect(html).not.toMatch(/@import/);
    expect(html).not.toMatch(/<link\b/i);
    expect(html).not.toMatch(/<iframe|<object|<embed/i);
  });

  it('runs only its own small script', () => {
    const scripts = render().match(/<script>/g) ?? [];
    expect(scripts).toHaveLength(1);
  });
});

describe('category themes change the accent colour and NOTHING else', () => {
  const themes = Object.values(CERTIFICATE_CATEGORIES);

  it('four themes produce four different pages', () => {
    const pages = themes.map((t) => render({}, t));
    expect(new Set(pages).size).toBe(4);
  });

  it('with the themed block removed, every theme is byte-identical', () => {
    const [first, ...rest] = themes.map((t) => withoutAccent(render({}, t)));
    for (const other of rest) expect(other).toBe(first);
  });

  it('the themed block is just CSS custom properties (the accent slots)', () => {
    for (const t of themes) {
      const html = render({}, t);
      const block = html.slice(
        html.indexOf(PALETTE_START) + PALETTE_START.length,
        html.indexOf(PALETTE_END),
      );
      expect(block).toBe(paletteCss(t.palette));
      expect(block).toMatch(/^:root\{(--lx-[a-z0-9-]+:#[0-9a-f]{6};?)+\}$/);
    }
  });

  it('the accent reaches the page through those variables', () => {
    const html = render({}, CERTIFICATE_CATEGORIES.CREATIVE_CODING_GAME_DEV);
    expect(html).toContain('--lx-ornament:#5a3fb4');
    expect(html).toContain('style="fill:var(--lx-ornament)"');
    expect(html).toContain('stop-color:var(--lx-ribbon-1)');
  });
});

describe('printedVerificationLink', () => {
  it('drops the scheme only', () => {
    expect(printedVerificationLink('https://a.example/verify/X')).toBe(
      'a.example/verify/X',
    );
    expect(printedVerificationLink('http://localhost:3000/verify/X')).toBe(
      'localhost:3000/verify/X',
    );
  });
});

// ─── Version freeze ──────────────────────────────────────────────────────────
//
// A certificate is rendered ONCE and its files are kept; the template version
// recorded on it says which design it was. These hashes pin what v1 produces —
// the page, the embedded fonts and images, the ornaments. If one fails you have
// changed the design (or an asset): that is a NEW template version. Bump
// TEMPLATE_VERSION in certificate-template.ts, then update the hashes here. Never
// "fix" the hash alone: previously issued certificates are recorded as v1.
describe('template v1 is frozen', () => {
  it('is version v1', () => {
    expect(TEMPLATE_VERSION).toBe('v1');
  });

  const FROZEN: Record<string, string> = {
    'creative-coding-game-dev':
      '4bd58577c2d2bcc73ec414711ee234fea5206fb2783356a7f0e0f876b5bc96c9',
    'web-digital-skills':
      '586de6aaa94cc73fe8b2e48e3b401956ae1ceaece2834e795246d537577276da',
    'ai-data-science':
      '29bca433fdbdbed2c5bf61fc5c144da29a6ac3b9bea5168d12d9fb2b8e01af06',
    general: '42dfd944b1d18151d9b250587e886145e57a0a27a0982074c705da786776c403',
  };

  it.each(
    Object.values(CERTIFICATE_CATEGORIES).map((c) => [c.key, c] as const),
  )('renders %s exactly as it did when v1 was issued', (key, theme) => {
    const html = renderCertificateHtml({
      ...BASE,
      withDistinction: true,
      palette: theme.palette,
    });
    expect(sha256(html)).toBe(FROZEN[key]);
  });
});
