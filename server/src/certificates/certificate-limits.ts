// FILE PATH: server/src/certificates/certificate-limits.ts
//
// Request limits for the certificate routes, per client address, per minute.
//
// The app's default is 20 requests a minute per route (ThrottlerModule in
// app.module.ts) — far too little for screens that refresh after every click, so
// each busy controller sets its own, as the student dashboard (120) and the
// classroom (120–300) do.
//
//   • Signed-in routes (admin and student): ordinary use — the admin menu's badge,
//     a page refreshing after each approval, a student's home page — must never
//     see a 429. Still bounded, so a runaway client cannot hammer the database.
//   • The PUBLIC verification route is the one with a real purpose beyond load:
//     certificate IDs are not guessable (a year plus 30 random bits), but the
//     endpoint should not be a free lookup oracle. It is also called by the Next.js
//     SERVER (the /verify page renders on the server), so every visitor of the page
//     arrives from that server's address — the limit is therefore generous enough
//     for a shared link to be opened by many people at once, and a person who is
//     refused is told "unavailable right now, try again", never "not found".

export const SIGNED_IN_LIMIT_PER_MINUTE = 300;
export const PUBLIC_VERIFY_LIMIT_PER_MINUTE = 120;
export const LIMIT_WINDOW_MS = 60_000;
