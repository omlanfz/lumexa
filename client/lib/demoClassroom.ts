// Temporary QA-only feature: lets exactly the two seeded demo accounts
// (Teacher Demo / Demo Student) jump into a shared classroom to test/QA the
// classroom experience. Remove this file, its two call sites in the teacher
// and student dashboards, /classroom-demo, and the server-side join-demo
// route once classroom QA is done.

export const DEMO_TEACHER_EMAIL = "dmtc@gmail.com";
export const DEMO_STUDENT_EMAIL = "dmst@gmail.com";

export function isDemoTeacherEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === DEMO_TEACHER_EMAIL;
}

export function isDemoStudentEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === DEMO_STUDENT_EMAIL;
}
