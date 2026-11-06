# Lumexa certificate: design source and reference renderer

The decisions, reasoning and rollout plan are in [`../CERTIFICATES.md`](../CERTIFICATES.md). This folder holds the files.

```
template/
  certificate.html      THE template (A4 landscape, {{placeholders}}). Edit this to change the design.
  fonts/                Cormorant Garamond, Inter, Noto Bengali (SIL OFL, licences included)
  images/               logo-mark.png, signature.sample.png (a STAND-IN; add the real scan as images/signature.png and the renderer uses it)
  ornaments/            frame.svg, rosette.svg, seal.svg (generated, see tools/generate-ornaments.mjs)
tools/
  render.mjs            fills the template and prints PDF + PNG + JPG preview + 1200x630 link card
  selftest.mjs          11 checks: hostile names, QR decodes, PDF properties, layout limits
  generate-ornaments.mjs  the guilloche border, rosette watermark and seal, from maths
  programs.json         sample program facts (production reads these from the database)
  samples.json          the sample students used for the previews
email/
  certificate-email.ts  proposed replacement for certificateIssuedEmail
  render-preview.ts     renders the old and new e-mail side by side
mockups/                dashboard / verification-page mockups (HTML + PNG)
samples/                rendered examples (PDF, PNG, contact sheet of all 7 programs)
```

## Run it

```bash
cd docs/certificates
npm install
npx playwright install chromium     # one-time: downloads the browser Playwright drives
```

```bash
npm run render                      # all samples -> samples/ (or: npm run render -- --only main --out /tmp/x)
```

```bash
npm test                            # the 11 self-checks
```

```bash
npm run email-preview               # old vs new e-mail -> email/
```

```bash
npm run mockups                     # dashboard mockups -> mockups/*.png
```

Nothing here is wired into the running app yet, and `docs/` is not part of the server or client build.
