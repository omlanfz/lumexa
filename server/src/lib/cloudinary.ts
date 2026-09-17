// FILE PATH: server/src/lib/cloudinary.ts
// NEW FILE: Cloudinary client singleton
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

// ─── Signed delivery URLs for verification documents ────────────────────────
//
// Cloudinary's "Restricted media types" account setting (on by default for
// clouds created after ~April 2024) blocks unsigned delivery of PDF/ZIP
// assets — HTTP 401 — *regardless* of whether the file was uploaded as
// resource_type 'raw' or 'image'. Uploading as 'raw' (see uploads.controller)
// only works around the *other* PDF-as-image-delivery restriction; it does
// not exempt PDFs from this one. The documented fix is to deliver those
// assets through a signed URL (`sign_url: true`), which Cloudinary always
// honors regardless of the restriction. Signing is cheap (local HMAC, no
// network call) and harmless for asset types that were never restricted, so
// every verification document is signed on the way out.
//
// New uploads (see uploads.controller.ts) store `publicId` + `resourceType`
// alongside the doc, so signing is exact. Older docs uploaded before that
// only have a bare Cloudinary delivery URL — this parses the public_id,
// resource_type, delivery type and format back out of that URL as a
// best-effort fallback.
export function signedDocumentUrl(doc: {
  url: string;
  publicId?: string | null;
  resourceType?: string | null;
}): string {
  try {
    const parsed = new URL(doc.url);
    if (!/(^|\.)cloudinary\.com$/.test(parsed.hostname)) return doc.url;

    let publicId = doc.publicId ?? undefined;
    let resourceType = doc.resourceType ?? undefined;
    let deliveryType = 'upload';
    let format: string | undefined;

    const match = parsed.pathname.match(
      /\/[^/]+\/(image|raw|video)\/(upload|private|authenticated)\/(?:v\d+\/)?(.+)$/,
    );
    if (match) {
      const [, matchedResourceType, matchedDeliveryType, rest] = match;
      resourceType = resourceType ?? matchedResourceType;
      deliveryType = matchedDeliveryType;
      if (!publicId) {
        if (matchedResourceType === 'raw') {
          // Raw public_ids keep their extension as part of the id.
          publicId = rest;
        } else {
          const lastDot = rest.lastIndexOf('.');
          publicId = lastDot > -1 ? rest.slice(0, lastDot) : rest;
          format = lastDot > -1 ? rest.slice(lastDot + 1) : undefined;
        }
      }
    }

    if (!publicId) return doc.url;

    return cloudinary.url(publicId, {
      resource_type: resourceType ?? 'image',
      type: deliveryType,
      format,
      secure: true,
      sign_url: true,
    });
  } catch {
    return doc.url;
  }
}
