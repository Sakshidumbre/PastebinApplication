import { NextRequest, NextResponse } from 'next/server';
import { createPaste } from '@/lib/kv';
import { generateId } from '@/lib/utils';
import { validateCreatePasteRequest, getTtlFromExpiration } from '@/lib/validation';
import { getTestTime, getBaseUrl } from '@/lib/request-utils';
import type { CreatePasteResponse, ErrorResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<CreatePasteResponse | ErrorResponse>> {
  try {
    const body = await request.json();
    
    const validation = validateCreatePasteRequest(body);
    if (!validation.valid) {
      return validation.error!;
    }

    const { content, ttl_seconds, max_views, title, syntax, expiration, burn_after_read } = body;
    const currentTime = getTestTime(request);

    const ttlSeconds = getTtlFromExpiration(expiration, ttl_seconds);
    const maxViews = burn_after_read ? 1 : (max_views ?? null);

    const id = generateId();
    const paste = {
      id,
      content: content.trim(),
      title: title?.trim() || undefined,
      syntax: syntax || undefined,
      createdAt: currentTime,
      ttlSeconds: ttlSeconds,
      maxViews: maxViews,
      viewCount: 0,
      burnAfterRead: burn_after_read || false,
    };

    await createPaste(paste, currentTime);

    const baseUrl = getBaseUrl(request);

    return NextResponse.json<CreatePasteResponse>({
      id,
      url: `${baseUrl}/p/${id}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating paste:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

