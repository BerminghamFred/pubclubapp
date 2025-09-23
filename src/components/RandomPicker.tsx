'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Star, Clock, RotateCcw, ExternalLink } from 'lucide-react';
import { Pub } from '@/data/types';

interface RandomPickerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    area?: string;
    amenities?: string[];
    openNow?: boolean;
    minRating?: number;
  };
  onViewPub: (pub: Pub) => void;
}

interface CandidatePub extends Pub {
  weight: number;
  isSponsored?: boolean;
}

export default function RandomPicker({ 
  isOpen, 
  onClose, 
  filters, 
  onViewPub 
}: RandomPickerProps) {
  const [candidateCount, setCandidateCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<CandidatePub | null>(null);
  const [lastWinners, setLastWinners] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [winningSlice, setWinningSlice] = useState<number | null>(null);
  const [finalRotation, setFinalRotation] = useState(0);

  // Fetch candidate count based on filters
  const fetchCandidateCount = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.area) params.append('area', filters.area);
      if (filters.amenities && filters.amenities.length > 0) {
        params.append('amenities', filters.amenities.join(','));
      }
      if (filters.openNow) params.append('open_now', 'true');
      if (filters.minRating) params.append('min_rating', filters.minRating.toString());
      if (lastWinners.size > 0) {
        params.append('exclude_ids', Array.from(lastWinners).join(','));
      }
      
      const response = await fetch(`/api/random-pub/candidates?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch candidate count');
      }
      
      const data = await response.json();
      
      if (data.availableCandidates === 0) {
        setError('No pubs match your current filters. Try removing some filters or widening your search area.');
        setCandidateCount(0);
        return;
      }
      
      setCandidateCount(data.availableCandidates);
    } catch (err) {
      setError('Failed to load pubs. Please try again.');
      console.error('Error fetching candidate count:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lastWinners]);

  // Fetch random pub from API
  const fetchRandomPub = useCallback(async (): Promise<CandidatePub | null> => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.area) params.append('area', filters.area);
      if (filters.amenities && filters.amenities.length > 0) {
        params.append('amenities', filters.amenities.join(','));
      }
      if (filters.openNow) params.append('open_now', 'true');
      if (filters.minRating) params.append('min_rating', filters.minRating.toString());
      if (lastWinners.size > 0) {
        params.append('exclude_ids', Array.from(lastWinners).join(','));
      }
      
      const response = await fetch(`/api/random-pub?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch random pub');
      }
      
      const data = await response.json();
      return data.pub as CandidatePub;
    } catch (err) {
      console.error('Error fetching random pub:', err);
      return null;
    }
  }, [filters, lastWinners]);

  // Handle spin
  const handleSpin = useCallback(async () => {
    if (candidateCount === 0) {
      await fetchCandidateCount();
      return;
    }
    
    setIsSpinning(true);
    setWinner(null);
    setWinningSlice(null);
    
    // Calculate random final rotation and winning slice
    const baseRotations = 5 + Math.random() * 5; // 5-10 full rotations
    const randomSlice = Math.floor(Math.random() * 12); // 0-11
    const sliceAngle = randomSlice * 30; // Each slice is 30 degrees
    const finalRotationDegrees = (baseRotations * 360) + sliceAngle;
    
    setFinalRotation(finalRotationDegrees);
    
    // Simulate spinning animation
    setTimeout(async () => {
      const selectedWinner = await fetchRandomPub();
      if (selectedWinner) {
        setWinner(selectedWinner);
        setWinningSlice(randomSlice);
        setLastWinners(prev => {
          const newSet = new Set(prev);
          newSet.add(selectedWinner.id);
          // Keep only last 5 winners
          if (newSet.size > 5) {
            const array = Array.from(newSet);
            newSet.delete(array[0]);
          }
          return newSet;
        });
        
        // Highlight winning slice briefly
        setTimeout(() => {
          setWinningSlice(null);
        }, 2000);
        
        // Track analytics event
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'random_spin_result', {
            pub_id: selectedWinner.id,
            pub_name: selectedWinner.name,
            pub_rating: selectedWinner.rating,
            filters: JSON.stringify(filters),
            area: filters.area || 'all',
            amenities_count: filters.amenities?.length || 0,
            open_now: filters.openNow || false,
            min_rating: filters.minRating || 0,
            seeded: false,
            candidates_count: candidateCount,
            session_id: Date.now().toString()
          });
        }
      }
      setIsSpinning(false);
    }, 3000); // 3 second animation to match CSS duration
  }, [candidateCount, fetchRandomPub, fetchCandidateCount, filters]);

  // Handle view pub
  const handleViewPub = useCallback(() => {
    if (winner) {
      onViewPub(winner);
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'random_view_pub', {
          pub_id: winner.id,
          pub_name: winner.name,
          pub_rating: winner.rating,
          source: 'random_picker',
          filters: JSON.stringify(filters),
          area: filters.area || 'all',
          session_id: Date.now().toString()
        });
      }
    }
  }, [winner, onViewPub, filters]);

  // Handle book pub
  const handleGetDirections = useCallback(() => {
    if (winner && winner._internal?.lat && winner._internal?.lng) {
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${winner._internal.lat},${winner._internal.lng}&destination_place_id=${winner._internal.place_id || ''}`;
      window.open(googleMapsUrl, '_blank');
      
      // Track analytics event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'random_directions_click', {
          pub_id: winner.id,
          pub_name: winner.name,
          pub_rating: winner.rating,
          source: 'random_picker',
          filters: JSON.stringify(filters),
          area: filters.area || 'all',
          session_id: Date.now().toString()
        });
      }
    }
  }, [winner]);

  // Fetch candidate count when filters change
  useEffect(() => {
    if (isOpen) {
      fetchCandidateCount();
      
      // Track analytics event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'random_spin_open', {
          filters: JSON.stringify(filters),
          area: filters.area || 'all',
          amenities_count: filters.amenities?.length || 0,
          open_now: filters.openNow || false,
          min_rating: filters.minRating || 0,
          candidates_count: candidateCount,
          session_id: Date.now().toString()
        });
      }
    }
  }, [isOpen, filters, fetchCandidateCount]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-gray-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            Spin the Wheel
            <span className="text-sm font-normal text-gray-500">
              ({candidateCount} pubs available)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">{error}</div>
              <Button onClick={fetchCandidateCount} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Finding the perfect pubs for you...</p>
            </div>
          )}

          {/* Wheel Animation */}
          {!isLoading && !error && candidateCount > 0 && (
            <div className="text-center">
              <div className="relative w-64 h-64 mx-auto mb-6 md:w-80 md:h-80">
                {/* SVG Wheel */}
                <svg
                  className={`w-full h-full transition-transform duration-[3000ms] ease-out`}
                  viewBox="0 0 200 200"
                  style={{
                    transform: isSpinning ? `rotate(${finalRotation}deg)` : 'rotate(0deg)'
                  }}
                >
                  {/* Wheel Slices */}
                  {Array.from({ length: 12 }, (_, i) => {
                    const angle = (i * 30); // 360 / 12 = 30 degrees per slice
                    const nextAngle = ((i + 1) * 30);
                    const largeArcFlag = 30 > 180 ? 1 : 0;
                    
                    // Calculate path for each slice
                    const startAngle = (angle * Math.PI) / 180;
                    const endAngle = (nextAngle * Math.PI) / 180;
                    
                    const x1 = 100 + 90 * Math.cos(startAngle);
                    const y1 = 100 + 90 * Math.sin(startAngle);
                    const x2 = 100 + 90 * Math.cos(endAngle);
                    const y2 = 100 + 90 * Math.sin(endAngle);
                    
                    const pathData = [
                      `M 100 100`,
                      `L ${x1} ${y1}`,
                      `A 90 90 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                      'Z'
                    ].join(' ');
                    
                    return (
                      <g key={i}>
                        {/* Main slice */}
                        <path
                          d={pathData}
                          fill={i % 2 === 0 ? '#08d78c' : '#ffffff'}
                          stroke={winningSlice === i ? '#ff6b6b' : '#333333'}
                          strokeWidth={winningSlice === i ? '3' : '1'}
                          className={`transition-all duration-300 ${
                            winningSlice === i ? 'drop-shadow-lg' : ''
                          }`}
                          style={{
                            filter: winningSlice === i ? 'brightness(1.2)' : 'none'
                          }}
                        />
                        {/* Subtle gradient overlay for 3D effect */}
                        <defs>
                          <radialGradient id={`gradient-${i}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={i % 2 === 0 ? '#0af09c' : '#f8f9fa'} stopOpacity="0.8"/>
                            <stop offset="100%" stopColor={i % 2 === 0 ? '#08d78c' : '#ffffff'} stopOpacity="1"/>
                          </radialGradient>
                        </defs>
                        <path
                          d={pathData}
                          fill={`url(#gradient-${i})`}
                          className="transition-all duration-300"
                        />
                      </g>
                    );
                  })}
                  
                  {/* Outer border */}
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#333333"
                    strokeWidth="2"
                  />
                </svg>
                
                {/* Center Circle Button */}
                <div className="absolute inset-8 rounded-full bg-[#08d78c] border-4 border-gray-300 flex items-center justify-center shadow-lg">
                  <div className="text-white text-lg font-bold">
                    SPIN
                  </div>
                </div>
                
                {/* Black Pointer */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                  <div className="w-0 h-0 border-l-3 border-r-3 border-b-6 border-l-transparent border-r-transparent border-b-black"></div>
                </div>
              </div>
              
              <Button 
                onClick={handleSpin}
                disabled={isSpinning}
                className="w-full bg-[#08d78c] hover:bg-[#06b875] text-white font-semibold py-3"
                size="lg"
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Spinning...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Spin the Wheel
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Winner Display */}
          {winner && !isSpinning && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl mb-2">🎉 Congratulations! 🎉</div>
                <div className="text-lg font-semibold text-[#08d78c]">
                  Your random pub is:
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border-2 border-[#08d78c]">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      {winner._internal?.photo_url ? (
                        <img 
                          src={winner._internal.photo_url} 
                          alt={winner.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-gray-400 text-2xl">🍺</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {winner.name}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      {winner.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {winner.address}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-semibold">{winner.rating}</span>
                          <span>({winner.reviewCount} reviews)</span>
                        </div>
                        
                        {winner.openingHours && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Open</span>
                          </div>
                        )}
                      </div>
                      
                      {winner.amenities && winner.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {winner.amenities.slice(0, 3).map(amenity => (
                            <span 
                              key={amenity}
                              className="px-2 py-1 bg-[#08d78c] text-black text-xs rounded-full"
                            >
                              {amenity}
                            </span>
                          ))}
                          {winner.amenities.length > 3 && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                              +{winner.amenities.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={handleViewPub}
                  className="flex-1 bg-[#08d78c] hover:bg-[#06b875] text-white font-semibold"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Pub
                </Button>
                
                {winner._internal?.lat && winner._internal?.lng && (
                  <Button 
                    onClick={handleGetDirections}
                    variant="outline"
                    className="flex-1"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Directions
                  </Button>
                )}
                
                <Button 
                  onClick={() => {
                    handleSpin();
                    // Track spin again event
                    if (typeof window !== 'undefined' && (window as any).gtag) {
                      (window as any).gtag('event', 'random_spin_again', {
                        previous_pub_id: winner?.id,
                        previous_pub_name: winner?.name,
                        filters: JSON.stringify(filters),
                        area: filters.area || 'all',
                        session_id: Date.now().toString()
                      });
                    }
                  }}
                  variant="outline"
                  className="px-4"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Spin Again
                </Button>
              </div>
            </div>
          )}

          {/* Filter Info */}
          <div className="text-sm text-gray-500 text-center">
            <p>
              Spinning from {candidateCount} pubs matching your current filters
              {lastWinners.size > 0 && ` (avoiding ${lastWinners.size} recent picks)`}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
