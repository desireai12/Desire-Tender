'use client';

import React from 'react';
import { TenderEligibilityDashboard } from '@/components/eligibility/TenderEligibilityDashboard';

export default function TenderEligibilityPage() {
  return (
    <main className="min-h-screen bg-[#f4f7f6] dark:bg-[#060b14] py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <TenderEligibilityDashboard />
    </main>
  );
}

