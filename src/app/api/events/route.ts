export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { 
  trackPageView, 
  trackPageViewBatch,
  trackSearch, 
  trackFilterUsage, 
  trackFilterUsageBatch,
  trackCtaClick,
  type PageViewEvent,
  type SearchEvent,
  type FilterUsageEvent,
  type CtaClickEvent
} from '@/lib/analytics'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { events } = body

    console.log('[API /events] Received request with events:', events?.length || 0)

    if (!Array.isArray(events)) {
      console.error('[API /events] Events is not an array:', typeof events)
      return NextResponse.json(
        { error: 'Events must be an array' },
        { status: 400 }
      )
    }

    if (events.length === 0) {
      console.log('[API /events] No events to process')
      return NextResponse.json({ success: true, processed: 0 })
    }

    // Separate events for batch processing (filter_usage and page_view)
    const filterUsageEvents: FilterUsageEvent[] = []
    const pageViewEvents: PageViewEvent[] = []
    const otherEvents: any[] = []

    events.forEach((event: any) => {
      if (event.type === 'filter_usage') {
        filterUsageEvents.push(event.data as FilterUsageEvent)
      } else if (event.type === 'page_view') {
        pageViewEvents.push(event.data as PageViewEvent)
      } else {
        otherEvents.push(event)
      }
    })

    // Process filter_usage events in batch with skipDuplicates
    if (filterUsageEvents.length > 0) {
      try {
        await trackFilterUsageBatch(filterUsageEvents)
        console.log('[API /events] Tracked filter usage batch:', filterUsageEvents.length)
      } catch (error) {
        console.error('[API /events] Failed to process filter usage batch:', error)
        // Continue processing other events even if batch fails
      }
    }

    // Process page_view events in batch with skipDuplicates
    if (pageViewEvents.length > 0) {
      try {
        await trackPageViewBatch(pageViewEvents)
        console.log('[API /events] Tracked page view batch:', pageViewEvents.length)
      } catch (error) {
        console.error('[API /events] Failed to process page view batch:', error)
        // Continue processing other events even if batch fails
      }
    }

    // Process other events in parallel
    const promises = otherEvents.map(async (event: any) => {
      try {
        console.log('[API /events] Processing event:', event.type, event.data)
        switch (event.type) {
          case 'search':
            await trackSearch(event.data as SearchEvent)
            console.log('[API /events] Tracked search')
            break
          case 'cta_click':
            await trackCtaClick(event.data as CtaClickEvent)
            console.log('[API /events] Tracked CTA click')
            break
          default:
            console.warn(`[API /events] Unknown event type: ${event.type}`)
        }
      } catch (error) {
        console.error(`[API /events] Failed to process event ${event.type}:`, error)
        throw error // Re-throw to see in Promise.all
      }
    })

    await Promise.all(promises)
    console.log('[API /events] Successfully processed all events')

    return NextResponse.json({ success: true, processed: events.length })
  } catch (error) {
    console.error('[API /events] Error processing events:', error)
    return NextResponse.json(
      { error: 'Failed to process events', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
