'use client';

import RandomPicker from '@/components/RandomPicker';
import { Pub } from '@/data/types';
import { generatePubSlug } from '@/utils/slugUtils';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

const HOW_IT_WORKS_STEPS = [
  {
    title: 'Tune your filters',
    description: 'Pick the neighbourhood, vibe, and must-have amenities to keep the wheel focused on pubs you will love.',
  },
  {
    title: 'Spin the wheel',
    description: 'Hit the big spin button and watch the wheel glide with satisfying momentum, ticks, haptics, and page-filling confetti.',
  },
  {
    title: 'Celebrate the pick',
    description: "We show you the winning pub's photo, rating, and highlights so you can dive straight into the details or spin again.",
  },
];

export default function RandomPage() {
  const searchParams = useSearchParams();

  const areaParam = searchParams.get('area') || undefined;
  const amenitiesParam = searchParams.get('amenities');
  const amenities = useMemo(
    () => (amenitiesParam ? amenitiesParam.split(',').filter(Boolean) : []),
    [amenitiesParam]
  );
  const openNow = searchParams.get('open_now') === '1';
  const minRatingParam = searchParams.get('min_rating');
  const minRating = minRatingParam ? parseFloat(minRatingParam) : undefined;

  const initialFilters = useMemo(
    () => ({
      area: areaParam,
      amenities,
      openNow,
      minRating,
    }),
    [amenities, areaParam, minRating, openNow]
  );

  const handleViewPub = (pub: Pub) => {
    window.open(`/pubs/${generatePubSlug(pub.name, pub.id)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <RandomPicker
        isOpen
        filters={initialFilters}
        onViewPub={handleViewPub}
        variant="page"
      />

      <section className="border-t border-white/5 bg-gray-950 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[6px] text-emerald-300/80">How it works</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">From filters to festivities in three steps</h2>
            <p className="mt-4 text-base text-gray-300">
              The Pub Randomiser keeps the fun while staying practical. Dial in the right mix of filters, spin the wheel, and let us celebrate the winning pub with all the info you need.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <div key={step.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm text-gray-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

