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

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Events must be an array' },
        { status: 400 }
      )
    }

    // Process events in parallel
    const promises = events.map(async (event: any) => {
      try {
        switch (event.type) {
          case 'page_view':
            await trackPageView(event.data as PageViewEvent)
            break
          case 'search':
            await trackSearch(event.data as SearchEvent)
            break
          case 'filter_usage':
            await trackFilterUsage(event.data as FilterUsageEvent)
            break
          case 'cta_click':
            await trackCtaClick(event.data as CtaClickEvent)
            break
          default:
            console.warn(`Unknown event type: ${event.type}`)
        }
      } catch (error) {
        console.error(`Failed to process event ${event.type}:`, error)
      }
    })

    await Promise.all(promises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing events:', error)
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    )
  }
}
