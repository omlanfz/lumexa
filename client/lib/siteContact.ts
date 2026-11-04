// Lumexa's official public contact details, shared by the footer, policy
// pages, trial page and every "contact us" link. This is the ONLY place they
// are written down — never paste a number or address into a component.
//
// These are the school's public details. The administrator's personal email
// and WhatsApp number are deliberately NOT here (or anywhere in the client's
// source): they live in server configuration. The server hands a signed-in
// student the admin's WhatsApp *chat link* for buying class credits (see
// server/src/students/credit-packages.ts); nothing here ever builds it.

export const CONTACT_EMAIL = "lumexa.school@gmail.com";
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;
export const WHATSAPP_URL = "https://wa.me/8801522122194";
export const WHATSAPP_DISPLAY = "+880 1522 122194";
