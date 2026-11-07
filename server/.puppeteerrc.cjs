// Puppeteer configuration (https://pptr.dev/guides/configuration).
//
// Certificates are rendered to PDF/PNG by headless Chromium
// (src/certificates/certificate-renderer.service.ts). `npm install` downloads a
// matching Chrome for Testing; by default into ~/.cache, which hosts such as Render
// keep for the BUILD but not for the running service. Keeping it inside the project
// directory means what the build downloaded is still there at runtime.
//
// To use a Chromium you install yourself instead (e.g. in a Docker image), set
// PUPPETEER_SKIP_DOWNLOAD=true at install time and CERTIFICATE_CHROMIUM_PATH at
// runtime — see docs/CERTIFICATES_SETUP.md.

const { join } = require('path');

/** @type {import("puppeteer").Configuration} */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  // The renderer launches full Chrome in its (new) headless mode — headless: true —
  // so the separate chrome-headless-shell build that Puppeteer also downloads by
  // default is never used. Skipping it roughly halves what each build downloads
  // and stores.
  'chrome-headless-shell': { skipDownload: true },
};
