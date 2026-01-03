'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import clsx from 'clsx';
import { SlidersHorizontal, X, MapPin, Star, Clock, ExternalLink } from 'lucide-react';
import SpinTheWheel, { Option } from '@/components/wheel/SpinTheWheel';
import { Pub } from '@/data/types';
import { pubData } from '@/data/pubData';
import { isPubOpenNow } from '@/utils/openingHours';
import { MapSidebar } from './MapSidebar';
import MobileFilterDrawer from './MobileFilterDrawer';
import PubPhoto from './PubPhoto';
import { getPhotoRefFromPub } from '@/utils/photoUtils';
import { useAnalytics } from '@/lib/analytics-client';
import { useSession } from 'next-auth/react';

type RandomPickerFilters = {
  area?: string;
  amenities?: string[];
  openNow?: boolean;
  minRating?: number;
  searchSelections?: any[];
};

interface RandomPickerProps {
  isOpen: boolean;
  onClose?: () => void;
  filters: RandomPickerFilters;
  onViewPub: (pub: Pub) => void;
  variant?: 'overlay' | 'page';
}

const DEFAULT_AREA = 'All Areas';
const DEFAULT_MIN_RATING = 0;
const DEFAULT_OPENING = 'Any Time';
const MAX_WHEEL_OPTIONS = 18;

const DEFAULT_AMENITIES_BY_CATEGORY: Record<string, string[]> = {
  '🎵 Music': ['DJs', 'Jukebox', 'Karaoke', 'Live Music'],
  '🍸 Drinks': ['Cocktails', 'Craft Beer', 'Craft Ales', 'Draught', 'Non-Alcoholic', 'Real Ale', 'Spirits', 'Taproom', 'Wine'],
  '🍔 Food': ['Bar Snacks', 'Bottomless Brunch', 'Bring Your Own Food', 'Burgers', 'Chips', 'English Breakfast', 'Fish and Chips', 'Gluten-Free Options', 'Kids Menu', 'Outdoor Food Service', 'Pie', 'Pizza', 'Sandwiches', 'Steak', 'Street Food Vendor', 'Sunday Roast', 'Thai', 'Vegetarian Options', 'Wings'],
  '🌳 Outdoor Space': ['Beer Garden', 'Heating', 'In the Sun', 'Large Space (20+ People)', 'Outdoor Viewing', 'Outside Bar', 'River View', 'Rooftop', 'Small Space (<20 People)', 'Street Seating', 'Under Cover'],
  '📺 Sport Viewing': ['Amazon Sports', 'Outdoor Viewing', 'Six Nations', 'Sky Sports', 'TNT Sports', 'Terrestrial TV'],
  '♿ Accessibility': ['Car Park', 'Child Friendly', 'Dance Floor', 'Disabled Access', 'Dog Friendly', 'Open Past Midnight', 'Open Past Midnight (Weekends)', 'Table Booking'],
  '💷 Affordability': ['Bargain', 'Premium', 'The Norm'],
  '🎯 Activities': ['Beer Pong', 'Billiards', 'Board Games', 'Darts', 'Game Machines', 'Ping Pong', 'Pool Table', 'Pub Quiz', 'Shuffleboard', 'Slot Machines', 'Table Football'],
  '💺 Comfort': ['Booths', 'Fireplace', 'Sofas', 'Stools at the Bar'],
};

const shuffle = <T,>(items: T[], seed = Math.random()): T[] => {
  const list = [...items];
  let m = list.length;
  let currentSeed = seed;
  while (m) {
    const i = Math.floor(Math.abs(Math.sin(currentSeed)) * m--);
    [list[m], list[i]] = [list[i], list[m]];
    currentSeed += 1;
  }
  return list;
};

const buildOption = (pub: Pub): Option => ({
  id: pub.id,
  label: pub.name,
  data: pub,
});

const RandomPicker = ({ isOpen, onClose, filters, onViewPub, variant = 'overlay' }: RandomPickerProps) => {
  const dialogTitleId = useId();
  const { trackCtaClick } = useAnalytics();
  const { data: session } = useSession();
  const [selectedArea, setSelectedArea] = useState(filters.area ?? DEFAULT_AREA);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(filters.amenities ?? []);
  const [minRating, setMinRating] = useState(filters.minRating ?? DEFAULT_MIN_RATING);
  const [openingFilter, setOpeningFilter] = useState(filters.openNow ? 'Open Now' : DEFAULT_OPENING);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [winnerOption, setWinnerOption] = useState<Option | null>(null);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const winnerRevealTimeoutRef = useRef<number | null>(null);
  const [recentWinners, setRecentWinners] = useState<string[]>([]);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const isPageVariant = variant === 'page';
  const isOverlayVariant = !isPageVariant;

  // Detect screen size for responsive wheel sizing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedArea(filters.area ?? DEFAULT_AREA);
    setSelectedAmenities(filters.amenities ?? []);
    setMinRating(filters.minRating ?? DEFAULT_MIN_RATING);
    setOpeningFilter(filters.openNow ? 'Open Now' : DEFAULT_OPENING);
  }, [filters, isOpen]);

  useEffect(() => {
    if (!isOpen || !isOverlayVariant) return;
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      const y = -parseInt(document.body.style.top || '0', 10);
      document.body.style.top = '';
      window.scrollTo(0, y || scrollY);
      document.body.style.width = '';
    };
  }, [isOpen, isOverlayVariant]);

  useEffect(() => {
    if (isOverlayVariant && !isOpen) {
      setMobileDrawerOpen(false);
    }
    return () => {
      if (winnerRevealTimeoutRef.current) {
        window.clearTimeout(winnerRevealTimeoutRef.current);
        winnerRevealTimeoutRef.current = null;
      }
    };
  }, [isOpen, isOverlayVariant]);

  const filtersState = useMemo(
    () => ({
      searchTerm: '',
      selectedArea,
      selectedAmenities,
      minRating,
      openingFilter,
    }),
    [selectedArea, selectedAmenities, minRating, openingFilter]
  );

  const filteredPubs = useMemo(() => {
    if (!isOpen && isOverlayVariant) return [];
    return pubData.filter((pub) => {
      if (selectedArea !== DEFAULT_AREA && pub.area !== selectedArea) {
        return false;
      }
      if (selectedAmenities.length > 0) {
        const amenityList = pub.amenities ?? pub.features ?? [];
        const hasAll = selectedAmenities.every((amenity) => amenityList.includes(amenity));
        if (!hasAll) return false;
      }
      if (minRating > 0 && (pub.rating ?? 0) < minRating) {
        return false;
      }
      if (openingFilter === 'Open Now' && !isPubOpenNow(pub.openingHours)) {
        return false;
      }
      return true;
    });
  }, [isOpen, isOverlayVariant, minRating, openingFilter, selectedAmenities, selectedArea]);

  const wheelOptions = useMemo(() => {
    if (!filteredPubs.length) return [];
    const available = filteredPubs.filter((pub) => !recentWinners.includes(pub.id));
    const pool = available.length > 0 ? available : filteredPubs;
    const limited = pool.length > MAX_WHEEL_OPTIONS ? shuffle(pool).slice(0, MAX_WHEEL_OPTIONS) : pool;
    const sorted = [...limited].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return sorted.map(buildOption);
  }, [filteredPubs, recentWinners]);

  const handleSpinWin = useCallback(
    (option: Option) => {
      setWinnerOption(option);
      if (winnerRevealTimeoutRef.current) {
        window.clearTimeout(winnerRevealTimeoutRef.current);
        winnerRevealTimeoutRef.current = null;
      }
      setWinnerOpen(false);
      setRecentWinners((prev) => {
        const next = [option.id, ...prev];
        return next.slice(0, 8);
      });

      // Track spin the wheel result event with analytics
      trackCtaClick({
        pubId: option.id,
        type: 'spin', // Track when wheel finishes and shows result
      });

      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'random_spin_result', {
          pub_id: option.id,
          pub_name: option.label,
          area: selectedArea || 'all',
          min_rating: minRating,
          amenities_count: selectedAmenities.length,
          open_now: openingFilter === 'Open Now',
        });
      }

      if (typeof window !== 'undefined') {
        import('@/lib/confetti')
          .then(({ confettiBurst }) =>
            confettiBurst({
              count: 400,
              origin: { x: 0.5, y: 0.1 },
              duration: 2400,
              gravity: 0.42,
            })
          )
          .catch(() => {});
      }

      winnerRevealTimeoutRef.current = window.setTimeout(() => {
        setWinnerOpen(true);
        winnerRevealTimeoutRef.current = null;
      }, 1200);
    },
    [minRating, openingFilter, selectedAmenities.length, selectedArea]
  );

  const handleViewWinner = useCallback(() => {
    if (!winnerOption?.data) return;
    
    // Track "view pub" click after spin
    trackCtaClick({
      pubId: winnerOption.id,
      type: 'spin_view_pub', // Track when user clicks "view pub" after spinning
    });
    
    onViewPub(winnerOption.data as Pub);
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'random_view_pub', {
        pub_id: winnerOption.id,
        pub_name: winnerOption.label,
        source: 'random_picker',
      });
    }
  }, [onViewPub, winnerOption, trackCtaClick]);

  const areaOptions = useMemo(() => {
    const areas = new Set<string>();
    pubData.forEach((pub) => {
      if (pub.area) areas.add(pub.area);
    });
    return [DEFAULT_AREA, ...Array.from(areas).sort()];
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedArea(DEFAULT_AREA);
    setSelectedAmenities([]);
    setMinRating(DEFAULT_MIN_RATING);
    setOpeningFilter(DEFAULT_OPENING);
  }, []);

  const handleDesktopFiltersChange = useCallback(
    (updated: {
      searchTerm: string;
      selectedArea: string;
      minRating: number;
      openingFilter: string;
      selectedAmenities: string[];
    }) => {
      setSelectedArea(updated.selectedArea);
      setSelectedAmenities(updated.selectedAmenities);
      setMinRating(updated.minRating);
      setOpeningFilter(updated.openingFilter);
    },
    []
  );

  const candidatesCountLabel = useMemo(() => {
    if (!filteredPubs.length) return 'No pubs match your filters';
    return `Spinning from ${filteredPubs.length} pubs`;
  }, [filteredPubs.length]);

  if (!isOpen && variant === 'overlay') {
    return null;
  }

  const mobileFilterButtonClasses = clsx(
    'fixed right-4 top-24 z-[80] flex items-center gap-2 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-black shadow-lg transition hover:from-emerald-400 hover:to-emerald-300 lg:hidden'
  );

  let wrapper: React.ReactNode;

  if (isOverlayVariant) {
    wrapper = (
      <div
        className="fixed inset-0 z-[70] flex min-h-screen bg-[var(--wheel-bg,#0a0f13)] text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
      >
        <h1 id={dialogTitleId} className="sr-only">
          Random pub picker
        </h1>
        <div className="flex w-full items-stretch">
          <div className="relative hidden h-full w-[360px] shrink-0 lg:block">
            <aside className="h-full overflow-y-auto overscroll-contain border-r border-gray-200 bg-white/95 text-gray-900 backdrop-blur-sm shadow-xl">
              <MapSidebar
                filters={filtersState}
                onFiltersChange={handleDesktopFiltersChange}
                areas={areaOptions.filter((area) => area !== DEFAULT_AREA)}
              />
            </aside>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 text-gray-500 shadow transition hover:bg-gray-200 hover:text-gray-700"
              aria-label="Close random picker"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <main className="flex-1 overflow-y-auto">
            <div className="relative flex min-h-screen flex-col items-center px-4 pb-24 pt-6 text-center sm:px-8 lg:px-12">
              <div className="flex w-full items-center justify-between lg:hidden">
                <h1 className="text-xl font-semibold text-white">Spin the Wheel</h1>
                <button
                  type="button"
                  onClick={() => onClose?.()}
                  className="rounded-full bg-white/10 p-2 text-gray-200 transition hover:bg-white/20 hover:text-white"
                  aria-label="Close random picker"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 flex flex-1 w-full flex-col items-center text-center">
                <div className="space-y-3">
                  <p className="text-sm uppercase tracking-[6px] text-emerald-300/80">Your next pub awaits</p>
                  <h2 className="text-3xl font-bold sm:text-4xl">Let fate pick tonight&apos;s spot</h2>
                  <p className="max-w-xl text-sm text-gray-300">
                    Spin the wheel to discover a pub at random. Refine the filters if you wish to select a random pub with specific criteria.
                  </p>
                </div>

                <div className="mt-4">
                  <div className="text-xs uppercase tracking-[4px] text-gray-400">{candidatesCountLabel}</div>
                </div>

                <div className="relative mt-8 flex flex-1 w-full items-center justify-center pb-24">
                  {wheelOptions.length === 0 ? (
                    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-12 text-sm text-gray-300 backdrop-blur">
                      <span className="text-2xl">😔</span>
                      <p>No pubs match your filters right now.</p>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <SpinTheWheel 
                      options={wheelOptions} 
                      onWin={handleSpinWin}
                      onSpinStart={() => {
                        // Spin start is tracked when wheel finishes in handleSpinWin
                        // This callback is available for future use if needed
                      }}
                      primary="#10B981" 
                      edgeGlow 
                    />
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  } else {
    wrapper = (
      <section className="relative bg-[var(--wheel-bg,#0a0f13)] text-white">
        <div className="w-full px-4 pt-10 pb-28 sm:px-6 lg:px-0 lg:pt-0 lg:pb-24">
          <div className="lg:grid lg:min-h-[calc(100vh-6rem)] lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-0">
            <aside className="relative hidden lg:block">
              <div className="sticky top-24">
                <div className="flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/95 text-gray-900 shadow-xl backdrop-blur-sm">
                  <div className="flex-1 overflow-y-auto overscroll-contain">
                    <MapSidebar
                      filters={filtersState}
                      onFiltersChange={handleDesktopFiltersChange}
                      areas={areaOptions.filter((area) => area !== DEFAULT_AREA)}
                    />
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex flex-col items-center text-center lg:items-center lg:text-center lg:px-12">
              <div className="flex items-center justify-center lg:hidden">
                <h1 className="text-xl font-semibold text-white">Spin the Wheel</h1>
              </div>

              <div className="mt-6 w-full max-w-2xl space-y-3 lg:mt-12">
                <p className="text-sm uppercase tracking-[6px] text-emerald-300/80">Your next pub awaits</p>
                <h2 className="text-3xl font-bold sm:text-4xl">Let fate pick tonight&apos;s spot</h2>
                <p className="text-sm text-gray-300">
                  Spin the wheel to discover a pub at random. Refine the filters if you wish to select a random pub with specific criteria.
                </p>
              </div>

              <div className="mt-6 text-xs uppercase tracking-[4px] text-gray-400 lg:mt-4">{candidatesCountLabel}</div>

              <div className="relative mt-12 flex w-full max-w-3xl items-center justify-center lg:mt-10">
                {wheelOptions.length === 0 ? (
                  <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-12 text-sm text-gray-300 backdrop-blur">
                    <span className="text-2xl">😔</span>
                    <p>No pubs match your filters right now.</p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <SpinTheWheel 
                    options={wheelOptions} 
                    onWin={handleSpinWin}
                    onSpinStart={() => {
                      // Spin start is tracked when wheel finishes in handleSpinWin
                      // This callback is available for future use if needed
                    }}
                    primary="#10B981" 
                    edgeGlow 
                    // Responsive: smaller on mobile, larger on desktop
                    // Let the component handle responsive sizing (defaults to 280px mobile, 480px desktop)
                    // Only override for large desktop screens
                    size={isLargeScreen ? 560 : undefined}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {wrapper}

      <button
        type="button"
        onClick={() => setMobileDrawerOpen(true)}
        className={mobileFilterButtonClasses}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>

      <MobileFilterDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        amenitiesByCategory={DEFAULT_AMENITIES_BY_CATEGORY}
        selectedAmenities={selectedAmenities}
        onAmenityToggle={(amenity) =>
          setSelectedAmenities((prev) =>
            prev.includes(amenity) ? prev.filter((item) => item !== amenity) : [...prev, amenity]
          )
        }
        onClearAll={() => {
          resetFilters();
          setMobileDrawerOpen(false);
        }}
        areas={areaOptions}
        selectedArea={selectedArea}
        onAreaChange={(area) => setSelectedArea(area)}
        minRating={minRating}
        onRatingChange={(rating) => setMinRating(rating)}
        openingFilter={openingFilter}
        onRemoveArea={() => setSelectedArea(DEFAULT_AREA)}
        onRemoveRating={() => setMinRating(DEFAULT_MIN_RATING)}
        onRemoveOpening={() => setOpeningFilter(DEFAULT_OPENING)}
        onSearch={() => {}}
      />

      {winnerOption && winnerOpen && (
        <WinnerModal
          option={winnerOption}
          onClose={() => setWinnerOpen(false)}
          onViewPub={handleViewWinner}
        />
      )}
    </>
  );
};

export default RandomPicker;

type WinnerModalProps = {
  option: Option;
  onClose: () => void;
  onViewPub: () => void;
};

const WinnerModal = ({ option, onClose, onViewPub }: WinnerModalProps) => {
  const titleId = useId();
  const winnerPub = option.data as Pub | undefined;
  const amenitiesPreview = winnerPub?.amenities?.slice(0, 6) ?? [];
  const isOpen = winnerPub?.openingHours ? isPubOpenNow(winnerPub.openingHours) : undefined;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm sm:items-center sm:px-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white text-gray-900 shadow-2xl sm:flex sm:max-w-3xl sm:max-h-[90vh]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close winner modal"
          className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-gray-600 shadow-md transition hover:bg-white hover:text-gray-900"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="h-56 w-full overflow-hidden bg-gray-200 sm:h-auto sm:w-[360px] sm:shrink-0">
          <PubPhoto
            photoRef={getPhotoRefFromPub(winnerPub?._internal)}
            photoName={winnerPub?._internal?.photo_name}
            placeId={winnerPub?._internal?.place_id}
            src={winnerPub?._internal?.photo_url}
            alt={winnerPub?.name ?? option.label}
            width={800}
            height={600}
            className="h-full w-full object-cover"
            fallbackIcon="🍺"
          />
        </div>

        <div className="space-y-6 p-6 sm:flex-1 sm:overflow-y-auto sm:p-8">
          <div>
            <p className="text-sm uppercase tracking-[4px] text-emerald-500">Tonight&apos;s pick</p>
            <h2 id={titleId} className="mt-2 text-2xl font-bold text-gray-900">
              {winnerPub?.name ?? option.label}
            </h2>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {winnerPub?.address && (
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
                <MapPin className="h-4 w-4 text-emerald-500" />
                {winnerPub.address}
              </span>
            )}

            {typeof winnerPub?.rating === 'number' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">{winnerPub.rating.toFixed(1)}</span>
                {winnerPub.reviewCount ? <span>({winnerPub.reviewCount} reviews)</span> : null}
              </span>
            )}

            {isOpen !== undefined && (
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
                <Clock className="h-4 w-4 text-emerald-500" />
                {isOpen ? 'Open now' : 'Currently closed'}
              </span>
            )}
          </div>

          {winnerPub?.description && (
            <p className="text-sm text-gray-600">{winnerPub.description}</p>
          )}

          {amenitiesPreview.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">Highlights</p>
              <div className="flex flex-wrap gap-2">
                {amenitiesPreview.map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600"
                  >
                    {amenity}
                  </span>
                ))}
                {winnerPub?.amenities && winnerPub.amenities.length > amenitiesPreview.length && (
                  <span className="inline-flex items-center rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                    +{winnerPub.amenities.length - amenitiesPreview.length} more
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onViewPub}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 sm:w-auto"
          >
            <ExternalLink className="h-4 w-4" />
            View pub page
          </button>
        </div>
      </div>
    </div>
  );
};

