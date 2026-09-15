// FILE PATH: client/components/TeacherPageSkeleton.tsx
//
// Lightweight in-content loading placeholder for teacher pages, mirroring
// the student dashboard's Skeleton/DashboardSkeleton pattern
// (client/app/student-dashboard/page.tsx) so both roles share the same
// loading UX. Rendered INSIDE the (teacher) route group's persistent nav —
// it replaces only the page content, never the nav — while a page's own
// data fetch is in flight.

'use client';

function Block({ className }: { className: string }) {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg ${className}`}
    />
  );
}

export default function TeacherPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <Block className="h-8 w-64" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Block className="h-32 rounded-xl" />
        <Block className="h-32 rounded-xl" />
      </div>
      <Block className="h-48 w-full rounded-xl" />
      <div className="space-y-2">
        <Block className="h-14 w-full rounded-xl" />
        <Block className="h-14 w-full rounded-xl" />
        <Block className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}
