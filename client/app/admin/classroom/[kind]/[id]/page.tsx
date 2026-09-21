// FILE PATH: client/app/admin/classroom/[kind]/[id]/page.tsx
//
// Admin joins an already-live class as a silent observer — reached from the
// "Join Class" button on /admin/classes (only shown when the class is
// actually live). See ClassroomService.adminJoinLiveClass for why this
// can't disrupt the teacher/student session.

'use client';

import { use } from 'react';
import ClassroomExperience from '@/components/classroom/ClassroomExperience';

interface PageProps {
  params: Promise<{ kind: string; id: string }>;
}

export default function AdminClassroomObserverPage({ params }: PageProps) {
  const { kind, id } = use(params);
  const isLesson = kind.toUpperCase() === 'LESSON';

  return <ClassroomExperience id={id} isLesson={isLesson} adminObserve />;
}
