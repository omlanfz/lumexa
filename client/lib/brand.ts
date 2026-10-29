// Brand people and imagery that can appear anywhere on the site (About page
// today; emails, teacher pages and social cards later). Image files live in
// client/public/brand/ so they are served as plain static assets.

export interface BrandImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export const FOUNDER = {
  name: "Fairooz Omlan",
  role: "Founder & CEO, Lumexa AI School",
  credentials: "NSU CSE graduate and coding educator with 6+ years of experience.",
  photo: {
    src: "/brand/fairooz-omlan.webp",
    width: 1122,
    height: 1402,
    alt: "Fairooz Omlan, Founder and CEO of Lumexa AI School",
  } satisfies BrandImage,
};

// Titir is the cat who inspired the Lumexa logo.
export const TITIR = {
  name: "Titir",
  caption: "For Titir, always.",
  photo: {
    src: "/brand/titir.webp",
    width: 1254,
    height: 1254,
    alt: "Titir, a black cat with golden eyes looking into the camera",
  } satisfies BrandImage,
};
