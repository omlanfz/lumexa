// Single source of truth for "is a teacher's profile 100% complete" so the
// teacher-profile completeness bar and the teacher-dashboard nudge card never
// drift out of sync with each other.

export interface TeacherProfileCompletionInput {
  user?: { avatarUrl?: string | null } | null;
  bio?: string | null;
  grades?: string[] | null;
  verificationDocs?: { type: string }[] | null;
}

const ID_DOC_TYPES = ["nid", "birth_certificate"];
const CERT_DOC_TYPES = [
  "bachelor_certificate",
  "master_certificate",
  "teaching_cert",
];

export const TEACHER_PROFILE_COMPLETION_WEIGHTS = {
  avatar: 20,
  bio: 25,
  grades: 15,
  id_doc: 20,
  cert_doc: 20,
} as const;

export function computeTeacherProfileCompletion(
  profile: TeacherProfileCompletionInput,
): { score: number; breakdown: Record<string, boolean> } {
  const docs = profile.verificationDocs ?? [];
  const has = {
    avatar: !!profile.user?.avatarUrl,
    bio: !!(profile.bio && profile.bio.length > 20),
    grades: !!profile.grades?.length,
    id_doc: docs.some((d) => ID_DOC_TYPES.includes(d.type)),
    cert_doc: docs.some((d) => CERT_DOC_TYPES.includes(d.type)),
  };
  const score = Object.entries(has).reduce(
    (acc, [key, val]) =>
      acc +
      (val
        ? TEACHER_PROFILE_COMPLETION_WEIGHTS[
            key as keyof typeof TEACHER_PROFILE_COMPLETION_WEIGHTS
          ]
        : 0),
    0,
  );
  return { score, breakdown: has };
}

export function isTeacherProfileComplete(
  profile: TeacherProfileCompletionInput,
): boolean {
  return computeTeacherProfileCompletion(profile).score >= 100;
}
