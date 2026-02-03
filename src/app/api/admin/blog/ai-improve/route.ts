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
    for (const k of keys) {
      if (body[k] != null && typeof body[k] === 'string') {
        const v = body[k].trim();
        if (k === 'content' && v.length > MAX_CONTENT_LENGTH) {
          input[k] = v.slice(0, MAX_CONTENT_LENGTH) + '...';
        } else {
          input[k] = v;
        }
      }
    }
    if (Object.keys(input).length === 0) {
      return NextResponse.json({ error: 'Provide at least one of: title, excerpt, content, metaTitle, metaDescription' }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    const systemPrompt = `You are an expert editor for a pub and nightlife blog. Improve the given text for:
- Clarity and engagement (clear, punchy sentences)
- SEO (natural keywords, compelling meta titles and descriptions)
- Formatting (short paragraphs, optional subheadings; keep structure readable)

Return ONLY a valid JSON object with the same keys that were sent. Do not add keys that were not in the input. Preserve the author's voice and facts; only improve wording and structure.`;

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

    // Only return keys that were in the request
    const out: Record<string, string> = {};
    for (const k of keys) {
      if (result[k] != null && typeof result[k] === 'string') {
        out[k] = result[k].trim();
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
