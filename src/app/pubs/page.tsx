'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import OptimizedPubMap from '@/components/OptimizedPubMap';
import PubCard from '@/components/PubCard';

// Dynamically import pubData to avoid blocking initial page load
const PubDataLoader = dynamic(() => import('@/components/PubDataLoader'), {
  loading: () => <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08d78c] mx-auto mb-2"></div><div className="text-gray-600">Loading pub data...</div></div>,
  ssr: false
});

export default function PubsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08d78c] mx-auto mb-2"></div><div className="text-gray-600">Loading...</div></div>}>
        <PubDataLoader />
      </Suspense>
    </div>
  );
} 