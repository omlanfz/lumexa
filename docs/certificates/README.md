# Lumexa certificate: design source and reference renderer

The decisions, reasoning and rollout plan are in [`../CERTIFICATES.md`](../CERTIFICATES.md). This folder holds the files.

```
template/
  certificate.html      THE template (A4 landscape, {{placeholders}}). Edit this to change the design.
  fonts/                Source Serif 4, Inter, Outfit, Noto Bengali (SIL OFL, licences included)
  icons/                Lucide line icons, one per program (ISC licence included)
  images/               logo-mark.png, signature.sample.png (a STAND-IN; add the real scan as images/signature.png and the renderer uses it)
  ornaments/            frame.svg, rosette.svg, seal.svg (generated, see tools/generate-ornaments.mjs)
tools/
  render.mjs            fills the template and prints PDF + PNG + JPG preview + 1200x630 link card;
                        also generateCertificateId() (program code + random, unguessable)
  selftest.mjs          21 checks: hostile names, QR decodes, PDF properties, layout limits, program icons, IDs
  generate-ornaments.mjs  the guilloche border, rosette watermark and seal, from maths
  programs.json         sample program facts (production reads these from the database)
  samples.json          the sample students used for the previews
email/
  certificate-email.ts  proposed replacement for certificateIssuedEmail
  render-preview.ts     renders the old and new e-mail side by side
mockups/                dashboard / verification-page mockups (HTML + PNG)
samples/                rendered examples (PDF, PNG, contact sheet of all 7 programs, design comparison)
```

## Run it

```bash
cd docs/certificates
npm install
npx playwright install chromium     # one-time: downloads the browser Playwright drives
```

No browser download possible (a server, a locked-down laptop)? Point `CHROMIUM_PATH` at any installed Chromium or Chrome instead, e.g. `CHROMIUM_PATH=/usr/bin/chromium npm test`. The same variable is how a production host with a system or serverless Chromium would be wired in.

```bash
npm run render                      # all samples -> samples/ (or: npm run render -- --only main --out /tmp/x)
```

```bash
npm test                            # the 21 self-checks
```

```bash
npm run email-preview               # old vs new e-mail -> email/
```

```bash
npm run mockups                     # dashboard mockups -> mockups/*.png
```

Nothing here is wired into the running app yet, and `docs/` is not part of the server or client build.
