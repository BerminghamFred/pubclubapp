'use client'

import { useEffect } from 'react'
import { analytics } from '@/lib/analytics-client'
import { usePathname } from 'next/navigation'
import { extractPubIdFromSlug } from '@/utils/slugUtils'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Track page views on route changes
  useEffect(() => {
    // Get page type and identifiers from pathname
    const path = pathname || ''
    
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
    
    // Track page view (only if not a pub page - pub pages are tracked in PubPageClient with more context)
    if (!path.startsWith('/pubs/')) {
      analytics.trackPageView({
        pubId,
        areaSlug,
        utm: Object.keys(utm).length > 0 ? utm : undefined,
        device: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      })
    }
  }, [pathname])

  return <>{children}</>
}

