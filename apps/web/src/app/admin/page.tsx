'use client';

import React from 'react';
import { AdminPortal } from '@/components/AdminPortal';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  return (
    <AdminPortal 
      onBackToUserPortal={() => router.push('/')} 
    />
  );
}
