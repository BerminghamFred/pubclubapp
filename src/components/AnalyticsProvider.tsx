'use client'

import { useEffect, useRef } from 'react'
import { analytics } from '@/lib/analytics-client'
import { usePathname } from 'next/navigation'
import { extractPubIdFromSlug } from '@/utils/slugUtils'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Track the last pathname we've tracked to prevent duplicates
  const lastTrackedPathname = useRef<string | null>(null)

  // Track page views on route changes
  useEffect(() => {
    // Get page type and identifiers from pathname
    const path = pathname || ''
    
    // Skip if we've already tracked this pathname (prevents duplicates from React StrictMode)
    if (lastTrackedPathname.current === path) {
      return
    }
    
    // Mark this pathname as tracked
    lastTrackedPathname.current = path
    
    // Determine page type and extract relevant data
    let pubId: string | undefined
    let areaSlug: string | undefined
    
    // Check if it's a pub page
    if (path.startsWith('/pubs/')) {
      const slug = path.split('/pubs/')[1]
      // Extract pub ID from slug using the utility function
      const extractedId = extractPubIdFromSlug(slug)
      pubId = extractedId || slug // Fallback to slug if extraction fails
    }
    
    // Check if it's an area page
    if (path.startsWith('/area/')) {
      areaSlug = path.split('/area/')[1]
    }
    
    // Get UTM parameters from URL (we'll use window.location to avoid Suspense issues)
    const utm: any = {}
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      urlParams.forEach((value, key) => {
        if (key.startsWith('utm_')) {
          utm[key] = value
        }
      })
    }
    
    // Track page view (skip pub pages - they're tracked in PubPageClient with more context)
    if (!path.startsWith('/pubs/')) {
      analytics.trackPageView({
        pubId,
        areaSlug,
        utm: Object.keys(utm).length > 0 ? utm : undefined,
        device: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      })
      
      // Flush after a short delay (only for non-pub pages)
      setTimeout(async () => {
        await analytics.flush()
      }, 2000)
    }
  }, [pathname])

  return <>{children}</>
}

