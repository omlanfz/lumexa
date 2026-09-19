'use client';

// Temporary QA-only route — see client/lib/demoClassroom.ts. Joins the fixed
// shared demo room instead of a real booking/lesson so the two seeded demo
// accounts (Teacher Demo / Demo Student) can test the classroom experience
// together on demand. Remove this page once classroom QA is done.

import ClassroomExperience from '@/components/classroom/ClassroomExperience';

export default function ClassroomDemoPage() {
  return <ClassroomExperience id="demo" isLesson={false} demo />;
}
