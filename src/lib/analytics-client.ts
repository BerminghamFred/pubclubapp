// Client-side analytics SDK for tracking events

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

export interface AnalyticsEvent {
  type: 'page_view' | 'search' | 'filter_usage' | 'cta_click' | 'homepage_tile'
  data: any
}

class AnalyticsClient {
  private sessionId: string
  private eventQueue: AnalyticsEvent[] = []
  private flushInterval: number = 5000 // 5 seconds (reduced for testing)
  private maxQueueSize: number = 50

  constructor() {
    this.sessionId = this.generateSessionId()
    if (isDev) {
      console.log('[Analytics] Initialized with session ID:', this.sessionId)
    }
    this.startFlushInterval()
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush()
      })
      
      // Also flush on visibility change (when user switches tabs/apps)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush()
        }
      })
    }
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
  }

  private startFlushInterval() {
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.flush()
      }, this.flushInterval)
    }
  }

  async flush() {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    try {
      if (isDev) console.log('[Analytics] Flushing events:', events.length, events)
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Analytics] Failed to send events:', response.status, errorText)
        // Re-queue events if send failed
        this.eventQueue.unshift(...events)
      } else {
        if (isDev) console.log('[Analytics] Successfully sent events')
      }
    } catch (error) {
      console.error('[Analytics] Failed to send analytics events:', error)
      // Re-queue events if send failed
      this.eventQueue.unshift(...events)
    }
  }

  private track(event: AnalyticsEvent) {
    if (isDev) console.log('[Analytics] Tracking event:', event.type, event.data)
    this.eventQueue.push(event)

    // Flush immediately if queue is full
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush()
    }
  }

  // Page view tracking with client-side deduping for pub pages
  trackPageView(data: {
    userId?: string
    pubId?: string
    areaSlug?: string
    ref?: string
    utm?: any
    device?: string
  }) {
    // Client-side deduping: only dedupe pub page views (when pubId is present)
    // Non-pub pages (homepage, area pages) should still be tracked
    if (data.pubId && typeof window !== 'undefined') {
      const STORAGE_KEY = 'pc_page_view_sent'
      
      try {
        // Load already-sent pubIds from sessionStorage
        const stored = sessionStorage.getItem(STORAGE_KEY)
        const sentPubIds = stored ? new Set<string>(JSON.parse(stored)) : new Set<string>()
        
        // Check if this pubId was already viewed in this session
        if (sentPubIds.has(data.pubId)) {
          if (isDev) console.log('[Analytics] Page view already tracked for this session:', data.pubId)
          return // Skip - already sent
        }
        
        // Add to Set and save back to sessionStorage
        sentPubIds.add(data.pubId)
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(sentPubIds)))
      } catch (error) {
        // If sessionStorage fails (e.g., private browsing), still try to send
        console.warn('[Analytics] Failed to check sessionStorage for page view deduping:', error)
      }
    }
    
    // Track the event (for both pub and non-pub pages)
    this.track({
      type: 'page_view',
      data: {
        sessionId: this.sessionId,
        ...data,
      }
    })
  }

  // Search tracking
  trackSearch(data: {
    userId?: string
    query: string
    cityId?: number
    boroughId?: number
    resultsCount?: number
  }) {
    this.track({
      type: 'search',
      data: {
        sessionId: this.sessionId,
        ...data,
      }
    })
  }

  // Filter usage tracking with client-side deduping
  trackFilterUsage(data: {
    filterKey: string
    cityId?: number
    boroughId?: number
  }) {
    // Client-side deduping: only send each filterKey once per session
    if (typeof window === 'undefined') {
      // Server-side rendering - skip deduping check
      this.track({
        type: 'filter_usage',
        data: {
          sessionId: this.sessionId,
          ...data,
        }
      })
      return
    }

    const STORAGE_KEY = 'pc_filter_usage_sent'
    
    try {
      // Load already-sent filterKeys from sessionStorage
      const stored = sessionStorage.getItem(STORAGE_KEY)
      const sentFilterKeys = stored ? new Set<string>(JSON.parse(stored)) : new Set<string>()
      
      // Check if this filterKey was already sent in this session
      if (sentFilterKeys.has(data.filterKey)) {
        if (isDev) console.log('[Analytics] Filter usage already tracked for this session:', data.filterKey)
        return // Skip - already sent
      }
      
      // Add to Set and save back to sessionStorage
      sentFilterKeys.add(data.filterKey)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(sentFilterKeys)))
      
      // Track the event
      this.track({
        type: 'filter_usage',
        data: {
          sessionId: this.sessionId,
          ...data,
        }
      })
    } catch (error) {
      // If sessionStorage fails (e.g., private browsing), still try to send
      console.warn('[Analytics] Failed to check sessionStorage for filter deduping:', error)
      this.track({
        type: 'filter_usage',
        data: {
          sessionId: this.sessionId,
          ...data,
        }
      })
    }
  }

  // CTA click tracking
  trackCtaClick(data: {
    pubId: string
    type: 'book' | 'call' | 'website' | 'spin' | 'spin_view_pub'
  }) {
    this.track({
      type: 'cta_click',
      data: {
        sessionId: this.sessionId,
        ...data,
      }
    })
  }

  // Homepage tile tracking (impressions and clicks)
  trackHomepageTile(data: {
    slotId: string
    type: 'impression' | 'click'
    title?: string
    amenity?: string
    city?: string
    href?: string
  }) {
    // Client-side deduping: only send each impression once per session
    if (data.type === 'impression' && typeof window !== 'undefined') {
      const STORAGE_KEY = 'pc_homepage_tile_impressions_sent'
      
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY)
        const sentSlotIds = stored ? new Set<string>(JSON.parse(stored)) : new Set<string>()
        
        // Check if this slotId impression was already sent in this session
        if (sentSlotIds.has(data.slotId)) {
          if (isDev) console.log('[Analytics] Homepage tile impression already tracked for this session:', data.slotId)
          return // Skip - already sent
        }
        
        // Add to Set and save back to sessionStorage
        sentSlotIds.add(data.slotId)
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(sentSlotIds)))
      } catch (error) {
        // If sessionStorage fails (e.g., private browsing), still try to send
        console.warn('[Analytics] Failed to check sessionStorage for homepage tile deduping:', error)
      }
    }
    
    this.track({
      type: 'homepage_tile',
      data: {
        sessionId: this.sessionId,
        ...data,
      }
    })
  }
}

// Public API surface (so we can type the no-op and the proxy without class internals)
export interface AnalyticsClientAPI {
  trackPageView: (data: Parameters<AnalyticsClient['trackPageView']>[0]) => void
  trackSearch: (data: Parameters<AnalyticsClient['trackSearch']>[0]) => void
  trackFilterUsage: (data: Parameters<AnalyticsClient['trackFilterUsage']>[0]) => void
  trackCtaClick: (data: Parameters<AnalyticsClient['trackCtaClick']>[0]) => void
  trackHomepageTile: (data: Parameters<AnalyticsClient['trackHomepageTile']>[0]) => void
  flush: () => void
}

// No-op client for SSR/build so we don't create real clients or log during server requests
const noop = () => {}
const noopClient: AnalyticsClientAPI = {
  trackPageView: noop,
  trackSearch: noop,
  trackFilterUsage: noop,
  trackCtaClick: noop,
  trackHomepageTile: noop,
  flush: noop,
}

let clientInstance: AnalyticsClient | null = null

function getAnalyticsClient(): AnalyticsClientAPI {
  if (typeof window === 'undefined') {
    return noopClient
  }
  if (!clientInstance) {
    clientInstance = new AnalyticsClient()
  }
  return clientInstance as unknown as AnalyticsClientAPI
}

export const analytics: AnalyticsClientAPI = new Proxy(noopClient, {
  get(_, prop) {
    return (getAnalyticsClient() as Record<string, unknown>)[prop as string]
  },
})

// React hook for easy use in components
export function useAnalytics() {
  const client = getAnalyticsClient()
  return {
    trackPageView: client.trackPageView.bind(client),
    trackSearch: client.trackSearch.bind(client),
    trackFilterUsage: client.trackFilterUsage.bind(client),
    trackCtaClick: client.trackCtaClick.bind(client),
    trackHomepageTile: client.trackHomepageTile.bind(client),
    flush: () => client.flush(),
  }
}

// Expose flush method for testing
export function flushAnalytics() {
  getAnalyticsClient().flush()
}
