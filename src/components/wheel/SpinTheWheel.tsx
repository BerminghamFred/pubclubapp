'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

type Option = {
  id: string;
  label: string;
  color?: string;
  data?: unknown;
};

type SpinTheWheelProps = {
  options: Option[];
  onWin: (option: Option) => void;
  onSpinStart?: () => void;
  size?: number;
  primary?: string;
  edgeGlow?: boolean;
  disabled?: boolean;
  className?: string;
};

const BASE_SPINS = 6;
const MIN_DURATION = 1800;
const MAX_EXTRA_DURATION = 600;

const DEFAULT_PRIMARY = '#10B981';
const DARK_TINT = '#0B1B16';

const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const usePrefersReducedMotion = () => {
  const [value, setValue] = useState(prefersReducedMotion());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event: MediaQueryListEvent) => setValue(event.matches);
    setValue(query.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return value;
};

const playTick = (() => {
  let audioCtx: AudioContext | null = null;
  return () => {
    if (typeof window === 'undefined') return;
    if (prefersReducedMotion()) return;
    try {
      audioCtx = audioCtx ?? new AudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.13);
    } catch (error) {
      // Ignore audio errors
    }
  };
})();

const maybeVibrate = (duration: number) => {
  if (typeof window === 'undefined') return;
  if (prefersReducedMotion()) return;
  if ('vibrate' in navigator) {
    navigator.vibrate?.(duration);
  }
};

const ease = (t: number) => {
  // cubic-bezier(0.12, 0.8, 0.22, 1) approximation
  const p0 = 0;
  const p1 = 0.8;
  const p2 = 0.22;
  const p3 = 1;
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
};

const buildSegments = (count: number) => {
  const angle = 360 / count;
  const paths: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const startAngle = (index * angle * Math.PI) / 180;
    const endAngle = ((index + 1) * angle * Math.PI) / 180;
    const largeArcFlag = angle > 180 ? 1 : 0;

    const x1 = 50 + 48 * Math.cos(startAngle);
    const y1 = 50 + 48 * Math.sin(startAngle);
    const x2 = 50 + 48 * Math.cos(endAngle);
    const y2 = 50 + 48 * Math.sin(endAngle);

    const d = [
      'M 50 50',
      `L ${x1} ${y1}`,
      `A 48 48 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    paths.push(d);
  }

  return paths;
};

const segmentColor = (index: number, primary: string) => {
  return index % 2 === 0 ? primary : DARK_TINT;
};

const SpinTheWheel = ({
  options,
  onWin,
  onSpinStart,
  size,
  primary = DEFAULT_PRIMARY,
  edgeGlow = true,
  disabled = false,
  className = '',
}: SpinTheWheelProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const wheelId = useId();
  const [currentRotation, setCurrentRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinWinnerRef = useRef<Option | null>(null);
  const animationRef = useRef<number | null>(null);
  const startRotationRef = useRef<number>(0);
  const targetRotationRef = useRef<number>(0);
  const spinStartRef = useRef<number>(0);
  const spinDurationRef = useRef<number>(0);
  const lastTickIndexRef = useRef<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  const wheelSize = useMemo(() => {
    if (typeof window === 'undefined') return size ?? 360;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    return size ?? (isDesktop ? 480 : 320);
  }, [size]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const segments = useMemo(() => {
    if (!options.length) return [];
    return buildSegments(options.length);
  }, [options.length]);

  const announceWinner = useCallback((winner: Option) => {
    if (!liveRegionRef.current) return;
    liveRegionRef.current.textContent = `Selected pub: ${winner.label}`;
  }, []);

  const animate = useCallback(
    (timestamp: number) => {
      if (spinStartRef.current === 0) {
        spinStartRef.current = timestamp;
      }

      const elapsed = timestamp - spinStartRef.current;
      const normalized = Math.min(1, elapsed / spinDurationRef.current);
      const eased = reducedMotion ? normalized : ease(normalized);

      const angle =
        startRotationRef.current +
        (targetRotationRef.current - startRotationRef.current) * eased;

      setCurrentRotation(angle);

      if (!reducedMotion && options.length > 0) {
        const normalizedAngle = (angle % 360 + 360) % 360;
        const segmentAngle = 360 / options.length;
        const tickIndex = Math.floor((normalizedAngle + segmentAngle / 2) / segmentAngle);

        if (tickIndex !== lastTickIndexRef.current) {
          lastTickIndexRef.current = tickIndex;
          playTick();
          maybeVibrate(10);
        }
      }

      if (normalized < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        setIsSpinning(false);
        spinStartRef.current = 0;
        spinDurationRef.current = 0;
        lastTickIndexRef.current = -1;

        const winner = spinWinnerRef.current;
        if (winner) {
          announceWinner(winner);
          maybeVibrate(20);
          onWin(winner);
          spinWinnerRef.current = null;
        }
      }
    },
    [options.length, reducedMotion, announceWinner, onWin]
  );

  const startSpin = useCallback(() => {
    if (disabled || isSpinning || !options.length) return;
    
    // Call onSpinStart callback if provided
    onSpinStart?.();
    
    const chosenIndex = Math.floor(Math.random() * options.length);
    const segmentAngle = 360 / options.length;
    const extraSegments = Math.floor(Math.random() * options.length);

    const baseRotation = BASE_SPINS * 360;
    const randomOffset = extraSegments * segmentAngle * Math.random();
    const target =
      baseRotation +
      randomOffset +
      (360 - chosenIndex * segmentAngle - segmentAngle / 2);

    spinDurationRef.current = reducedMotion
      ? 800
      : MIN_DURATION + Math.random() * MAX_EXTRA_DURATION;

    startRotationRef.current = currentRotation % 360;
    targetRotationRef.current = startRotationRef.current + target;
    spinStartRef.current = 0;
    lastTickIndexRef.current = -1;

    spinWinnerRef.current = options[chosenIndex];
    setIsSpinning(true);
    playTick();
    maybeVibrate(12);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);
  }, [animate, currentRotation, disabled, isSpinning, options, reducedMotion, onSpinStart]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        startSpin();
      }
    },
    [startSpin]
  );

  const radius = wheelSize / 2;

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto flex flex-col items-center gap-4 text-white ${className}`}
      style={{ width: wheelSize }}
      role="application"
      aria-label="Random pub picker wheel"
    >
      <div
        className="relative flex items-center justify-center rounded-full bg-[var(--wheel-ring,#0f1720)]"
        style={{
          width: wheelSize,
          height: wheelSize,
          boxShadow: edgeGlow
            ? `0 0 45px rgba(16, 185, 129, 0.25), inset 0 0 25px rgba(16, 185, 129, 0.2)`
            : 'inset 0 0 35px rgba(0,0,0,0.35)',
        }}
      >
        {/* Pointer */}
        <div
          className="pointer-events-none absolute -top-6 left-1/2 h-10 w-8 -translate-x-1/2"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 36" className="drop-shadow-lg">
            <path
              d="M12 0L24 36H0L12 0Z"
              fill="var(--wheel-pointer, #10b981)"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div
          className="relative flex items-center justify-center overflow-visible rounded-full bg-[var(--wheel-bg,#0a0f13)]"
          style={{
            width: wheelSize - 24,
            height: wheelSize - 24,
          }}
        >
          {options.length > 0 ? (
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 h-full w-full"
              style={{
                transform: `rotate(${currentRotation}deg)`,
                transition: isSpinning ? 'none' : 'transform 220ms ease-out',
              }}
            >
              <defs>
                <radialGradient id={`${wheelId}-centerGlow`} cx="50%" cy="50%" r="80%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                  <stop offset="65%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
              </defs>

              {segments.map((segmentPath, index) => (
                <g key={options[index]?.id ?? index}>
                  <path
                    d={segmentPath}
                    fill={segmentColor(index, options[index]?.color ?? primary)}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="0.7"
                  />
                  <path
                    d={segmentPath}
                    fill={`url(#${wheelId}-centerGlow)`}
                    opacity="0.4"
                  />
                </g>
              ))}

              <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
            </svg>
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-gray-300">
              No pubs match your filters. Try adjusting the filters to add more options.
            </div>
          )}

          <button
            type="button"
            onClick={startSpin}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSpinning || options.length === 0}
            aria-label="Spin the wheel"
            className={`relative flex h-32 w-32 items-center justify-center rounded-full bg-white/10 text-lg font-semibold tracking-wide text-white outline-none transition-transform duration-150 focus-visible:ring-4 focus-visible:ring-[rgba(16,185,129,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
              disabled || isSpinning || options.length === 0
                ? 'cursor-not-allowed opacity-60'
                : 'hover:scale-[1.03] active:scale-[0.97]'
            }`}
            style={{
              boxShadow:
                '0 0 0 3px rgba(15,23,32,0.85), inset 0 0 25px rgba(16,185,129,0.25), 0 18px 35px rgba(0,0,0,0.4)',
              border: `3px solid rgba(255,255,255,0.08)`,
            }}
          >
            <span>Spin</span>
            <span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                boxShadow: '0 0 25px rgba(16,185,129,0.25)',
              }}
            />
          </button>
        </div>
      </div>

      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </div>
  );
};

export type { Option, SpinTheWheelProps };
export default SpinTheWheel;


