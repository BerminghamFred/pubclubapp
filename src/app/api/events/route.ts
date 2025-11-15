import { NextRequest, NextResponse } from 'next/server'
import { 
  trackPageView, 
  trackSearch, 
  trackFilterUsage, 
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

    // Process events in parallel
    const promises = events.map(async (event: any) => {
      try {
        console.log('[API /events] Processing event:', event.type, event.data)
        switch (event.type) {
          case 'page_view':
            await trackPageView(event.data as PageViewEvent)
            console.log('[API /events] Tracked page view')
            break
          case 'search':
            await trackSearch(event.data as SearchEvent)
            console.log('[API /events] Tracked search')
            break
          case 'filter_usage':
            await trackFilterUsage(event.data as FilterUsageEvent)
            console.log('[API /events] Tracked filter usage')
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
