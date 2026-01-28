import { NextRequest, NextResponse } from 'next/server';
import { createPaste } from '@/lib/kv';
import { generateId } from '@/lib/utils';
import { validateCreatePasteRequest } from '@/lib/validation';
import { getTestTime, getBaseUrl } from '@/lib/request-utils';
import type { CreatePasteResponse, ErrorResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<CreatePasteResponse | ErrorResponse>> {
  try {
    const body = await request.json();
    
    const validation = validateCreatePasteRequest(body);
    if (!validation.valid) {
      return validation.error!;
    }

    const { content, ttl_seconds, max_views } = body;
    const currentTime = getTestTime(request);

    const id = generateId();
    const paste = {
      id,
      content: content.trim(),
      createdAt: currentTime,
      ttlSeconds: ttl_seconds ?? null,
      maxViews: max_views ?? null,
      viewCount: 0,
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

