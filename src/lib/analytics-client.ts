// Client-side analytics SDK for tracking events

export interface AnalyticsEvent {
  type: 'page_view' | 'search' | 'filter_usage' | 'cta_click'
  data: any
}

class AnalyticsClient {
  private sessionId: string
  private eventQueue: AnalyticsEvent[] = []
  private flushInterval: number = 10000 // 10 seconds
  private maxQueueSize: number = 50

  constructor() {
    this.sessionId = this.generateSessionId()
    this.startFlushInterval()
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush()
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

  private async flush() {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      })
    } catch (error) {
      console.error('Failed to send analytics events:', error)
      // Re-queue events if send failed
      this.eventQueue.unshift(...events)
    }
  }

  private track(event: AnalyticsEvent) {
    this.eventQueue.push(event)

    // Flush immediately if queue is full
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush()
    }
  }

  // Page view tracking
  trackPageView(data: {
    userId?: string
    pubId?: string
    areaSlug?: string
    ref?: string
    utm?: any
    device?: string
  }) {
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

  // Filter usage tracking
  trackFilterUsage(data: {
    filterKey: string
    cityId?: number
    boroughId?: number
  }) {
    this.track({
      type: 'filter_usage',
      data: {
        sessionId: this.sessionId,
        ...data,
      }
    })
  }

  // CTA click tracking
  trackCtaClick(data: {
    pubId: string
    type: 'book' | 'call' | 'website'
  }) {
    this.track({
      type: 'cta_click',
      data: {
        sessionId: this.sessionId,
        ...data,
      }
    })
  }
}

// Create singleton instance
export const analytics = new AnalyticsClient()

// React hook for easy use in components
export function useAnalytics() {
  return {
    trackPageView: analytics.trackPageView.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackFilterUsage: analytics.trackFilterUsage.bind(analytics),
    trackCtaClick: analytics.trackCtaClick.bind(analytics),
  }
}
