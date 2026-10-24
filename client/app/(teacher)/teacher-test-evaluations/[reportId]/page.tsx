'use client';

import { use } from 'react';
import ReportCardEditor from '@/components/teacher/ReportCardEditor';

export default function TestEvaluationDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = use(params);
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <ReportCardEditor reportId={reportId} />
    </div>
  );
}
