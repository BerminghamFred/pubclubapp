export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

function requireAdmin(session: unknown) {
  const user = session as { user?: { type?: string } };
  return user?.user?.type === 'admin';
}

const MAX_CONTENT_LENGTH = 12000; // ~3k tokens input cap for content

// POST /api/admin/blog/ai-improve
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !requireAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const body = await request.json();
    const keys = ['title', 'excerpt', 'content', 'metaTitle', 'metaDescription'] as const;
    const input: Record<string, string> = {};
    const hasContent = body.title || body.excerpt || body.content;
    
    // Always include title/excerpt/content if provided
    for (const k of ['title', 'excerpt', 'content'] as const) {
      if (body[k] != null && typeof body[k] === 'string') {
        const v = body[k].trim();
        if (k === 'content' && v.length > MAX_CONTENT_LENGTH) {
          input[k] = v.slice(0, MAX_CONTENT_LENGTH) + '...';
        } else if (v) {
          input[k] = v;
        }
      }
    }
    
    // If title/excerpt/content provided but meta fields not, auto-generate them
    if (hasContent && (!body.metaTitle || !body.metaDescription)) {
      // Will generate metaTitle and metaDescription from title/excerpt/content
    }
    
    // Include existing meta fields if provided
    for (const k of ['metaTitle', 'metaDescription'] as const) {
      if (body[k] != null && typeof body[k] === 'string' && body[k].trim()) {
        input[k] = body[k].trim();
      }
    }
    
    if (Object.keys(input).length === 0) {
      return NextResponse.json({ error: 'Provide at least one of: title, excerpt, content' }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    const systemPrompt = `You are an expert SEO editor for a pub and nightlife blog. Your tasks:
1. Improve text for clarity and engagement (clear, punchy sentences)
2. Generate SEO-optimized meta titles (50-60 chars, include keywords, compelling)
3. Generate SEO-optimized meta descriptions (150-160 chars, include keywords, call-to-action)
4. Format content (short paragraphs, optional subheadings; keep structure readable)

IMPORTANT: If title/excerpt/content are provided, ALWAYS generate metaTitle and metaDescription even if not in input. Use the content to create compelling, keyword-rich meta tags.

Return ONLY a valid JSON object. Include all keys that were sent PLUS metaTitle and metaDescription if title/excerpt/content were provided. Preserve the author's voice and facts; only improve wording and structure.`;

    const userContent = JSON.stringify(input);

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
    }

    // Strip possible markdown code block
    let jsonStr = raw;
    if (raw.startsWith('```')) {
      const end = raw.indexOf('```', 3);
      jsonStr = end > 0 ? raw.slice(3, end).trim() : raw.replace(/^```\w*\n?|```$/g, '').trim();
    }

    let result: Record<string, string>;
    try {
      result = JSON.parse(jsonStr) as Record<string, string>;
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 502 });
    }

    // Return all keys from result (including auto-generated metaTitle/metaDescription)
    const out: Record<string, string> = {};
    for (const k of keys) {
      if (result[k] != null && typeof result[k] === 'string') {
        out[k] = result[k].trim();
      }
    }
    
    // Also include any meta fields that were auto-generated
    if (hasContent) {
      if (result.metaTitle && typeof result.metaTitle === 'string') {
        out.metaTitle = result.metaTitle.trim();
      }
      if (result.metaDescription && typeof result.metaDescription === 'string') {
        out.metaDescription = result.metaDescription.trim();
      }
    }

    return NextResponse.json({ suggested: out });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (String(msg).includes('429') || (error as { status?: number })?.status === 429) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again shortly.' }, { status: 429 });
    }
    console.error('Admin blog ai-improve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
