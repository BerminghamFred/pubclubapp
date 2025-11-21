'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type WinToastProps<T = unknown> = {
  open: boolean;
  option?: {
    id: string;
    label: string;
    data?: T;
  } | null;
  onClose: () => void;
  onView?: (data: T | undefined) => void;
  duration?: number;
};

const WinToast = <T,>({
  open,
  option,
  onClose,
  onView,
  duration = 5000,
}: WinToastProps<T>) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (!open || !option) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(onClose, duration);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [open, option, onClose, duration]);

  useEffect(() => {
    if (!open || !option || reducedMotionRef.current) return;
    // Lazy load confetti to avoid SSR issues
    (async () => {
      const { confettiBurst } = await import('@/lib/confetti');
      confettiBurst({
        origin: { x: 0.8, y: 0.2 },
        count: 120,
      });
    })();
  }, [open, option]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !option) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4 sm:px-0">
      <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-emerald-400/60 bg-[rgba(10,15,19,0.95)] p-4 text-white shadow-2xl backdrop-blur-md">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-2xl">
          🎉
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-300">Winner!</p>
          <p className="mt-1 text-base font-semibold text-white">{option.label}</p>
          <p className="mt-2 text-sm text-gray-300">
            Tap view to open the pub page and start planning your visit.
          </p>
          {onView && (
            <button
              type="button"
              onClick={() => onView(option.data as T | undefined)}
              className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
            >
              View pub
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm text-gray-300 transition hover:bg-white/15 hover:text-white"
          aria-label="Dismiss winner notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export type { WinToastProps };
export default WinToast;






