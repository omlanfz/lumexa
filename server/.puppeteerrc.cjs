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
};
