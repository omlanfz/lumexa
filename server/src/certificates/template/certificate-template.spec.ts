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
    expect(text).toContain('DATE OF COMPLETION');
    expect(text).toContain('2 November 2026');
    expect(text).toContain('DATE OF ISSUE');
    expect(text).toContain('6 November 2026');
    expect(text).toContain('CERTIFICATE ID');
    expect(text).toContain('LXA-2026-A7K9Q2');
  });

  it("keeps the supplied design's own third italic line, exactly", () => {
    expect(text).toContain('Awarded on passing the Final Test.');
    // …and no longer carries the completion date in its place (that was v1)
    expect(text).not.toContain('Completed on');
    // the line is the same on every certificate: it is design text, not data
    const other = visibleText(
      render({ completionDate: '2027-02-14', recipientName: 'Ben Carter' }),
    );
    expect(other).toContain('Awarded on passing the Final Test.');
  });

  it('prints the completion date in its own pair above the issue date, in the same style', () => {
    expect(text.indexOf('DATE OF COMPLETION')).toBeGreaterThan(-1);
    expect(text.indexOf('DATE OF COMPLETION')).toBeLessThan(
      text.indexOf('DATE OF ISSUE'),
    );
    expect(text.indexOf('DATE OF ISSUE')).toBeLessThan(
      text.indexOf('CERTIFICATE ID'),
    );
    // the label/value pair order: label, then its value
    const afterCompletion = text.slice(text.indexOf('DATE OF COMPLETION'));
    expect(afterCompletion.indexOf('2 November 2026')).toBeLessThan(
      afterCompletion.indexOf('DATE OF ISSUE'),
    );
    // both dates are really the two different dates that were given
    const completionRender = visibleText(
      render({ completionDate: '2026-10-20', issueDate: '2026-11-06' }),
    );
    expect(completionRender).toMatch(
      /DATE OF COMPLETION\s+20 October 2026\s+DATE OF ISSUE\s+6 November 2026/,
    );
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
// "fix" the hash alone: previously issued certificates are recorded with the version
// they were rendered with.
//
// History: v1 was the first release (completion date in the third italic line);
// v2 restored the design's own line and added the completion-date pair.
describe('template v2 is frozen', () => {
  it('is version v2', () => {
    expect(TEMPLATE_VERSION).toBe('v2');
  });

  const FROZEN: Record<string, string> = {
    'creative-coding-game-dev':
      'a35e7cafa0e2e07d080599947179a91dd04a574a49725601b45b85d48172030a',
    'web-digital-skills':
      '168396af40a0fcc3b67798164a65f4388670c050add5f8cf914e9f26207e5dc1',
    'ai-data-science':
      'd93928d248b5a4d9c15739dd3a5502e828a101d758bf06c1134a222da67863bf',
    general: '438ec83cc6808cf0877e4679d5977934709d084cc98aca2452bc2678f5c76482',
  };

  it.each(
    Object.values(CERTIFICATE_CATEGORIES).map((c) => [c.key, c] as const),
  )('renders %s exactly as it did when v2 was issued', (key, theme) => {
    const html = renderCertificateHtml({
      ...BASE,
      withDistinction: true,
      palette: theme.palette,
    });
    expect(sha256(html)).toBe(FROZEN[key]);
  });
});
