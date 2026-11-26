'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TenderReviewWorkspace } from '@/components/eligibility/TenderReviewWorkspace';
import { Loader2 } from 'lucide-react';

function TenderReviewContent() {
  const searchParams = useSearchParams();
  const tenderId = searchParams.get('id') || 'radhanpur';

  return <TenderReviewWorkspace tenderId={tenderId} />;
}

export default function TenderReviewPage() {
  return (
    <main className="min-h-screen bg-[#f4f7f6] dark:bg-[#060b14] py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      }>
        <TenderReviewContent />
      </Suspense>
    </main>
  );
}

