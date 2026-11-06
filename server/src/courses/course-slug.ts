// FILE PATH: server/src/courses/course-slug.ts
//
// Course slugs used to carry a "-path" suffix ("ai-builder-path"). Lumexa now
// names its programs without it ("ai-builder"), and admins can edit slugs in
// /admin/courses at any time. Everything that identifies a default program by
// slug goes through canonicalCourseSlug so both spellings (and any database
// that has not been renamed yet) resolve to the same program.

const LEGACY_SUFFIX = /-path$/;

/** "ai-builder-path" -> "ai-builder"; any other slug is returned unchanged. */
export function canonicalCourseSlug(slug: string): string {
  return slug.replace(LEGACY_SUFFIX, '');
}

/** The pre-rename spelling of a canonical slug ("ai-builder" -> "ai-builder-path"). */
export function legacyCourseSlug(slug: string): string {
  return `${canonicalCourseSlug(slug)}-path`;
}
