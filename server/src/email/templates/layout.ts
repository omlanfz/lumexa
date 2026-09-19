// FILE PATH: server/src/email/templates/layout.ts
//
// One shared, mobile-friendly branded wrapper every Lumexa email template
// renders its content through — keeps every notification visually
// consistent without copy-pasting the same header/footer HTML into each
// template file. Table-based layout + inline styles because that's what
// actually renders consistently across real email clients (Gmail, Outlook,
// Apple Mail) — CSS classes/flex/grid are not reliable there.

const BRAND_TEAL = '#0d9488';
const INK = '#0f172a';
const MUTED = '#64748b';

export function emailButton(
  label: string,
  url: string,
  color = BRAND_TEAL,
): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 8px; background: ${color};">
          <a href="${url}" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

export function emailLayout(params: {
  title: string;
  bodyHtml: string;
  previewText?: string;
}): string {
  const { title, bodyHtml, previewText } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
  ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${previewText}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f1f5f9; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: ${INK}; padding: 24px 32px;">
              <span style="font-size: 20px; font-weight: 800; color: #5eead4; letter-spacing: 0.5px;">🚀 Lumexa</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px; color: ${INK}; font-size: 15px; line-height: 1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: ${MUTED}; font-size: 12px; line-height: 1.6;">
                Lumexa · Online tutoring for K-12 students<br />
                Questions? Reach us at <a href="mailto:support@lumexa.app" style="color: ${BRAND_TEAL};">support@lumexa.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Dhaka',
  }).format(date);
}
