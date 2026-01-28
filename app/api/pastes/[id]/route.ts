import { NextRequest, NextResponse } from 'next/server';
import { getPaste, incrementViewCount } from '@/lib/kv';
import { isPasteAvailable } from '@/lib/utils';
import { getTestTime, getCurrentUser } from '@/lib/request-utils';
import type { GetPasteResponse, ErrorResponse } from '@/lib/types';

const NOT_FOUND_RESPONSE = NextResponse.json<ErrorResponse>(
  { error: 'Paste not found' },
  { status: 404 }
);

function calculateExpiresAt(paste: { createdAt: number; ttlSeconds: number | null }): string | null {
  if (!paste.ttlSeconds) {
    return null;
  }
  return new Date(paste.createdAt + paste.ttlSeconds * 1000).toISOString();
}

function calculateRemainingViews(paste: { maxViews: number | null; viewCount: number }): number | null {
  if (paste.maxViews === null) {
    return null;
  }
  return Math.max(0, paste.maxViews - paste.viewCount);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<GetPasteResponse | ErrorResponse>> {
  try {
    const { id } = params;
    const currentTime = getTestTime(request);
    
    // Parallelize independent operations
    const [paste, userId] = await Promise.all([
      getPaste(id, currentTime),
      getCurrentUser(request)
    ]);

    if (!paste) {
      return NOT_FOUND_RESPONSE;
    }

    if (paste.privacy === 'private' && (!userId || paste.userId !== userId)) {
      return NOT_FOUND_RESPONSE;
    }

    if (!isPasteAvailable(paste, currentTime)) {
      return NOT_FOUND_RESPONSE;
    }

    await incrementViewCount(id, currentTime);

    // Fetch the updated paste to get the correct viewCount after incrementing
    const updatedPaste = await getPaste(id, currentTime);
    if (!updatedPaste) {
      return NOT_FOUND_RESPONSE;
    }

    const response: GetPasteResponse = {
      content: updatedPaste.content,
      remaining_views: calculateRemainingViews(updatedPaste),
      expires_at: calculateExpiresAt(updatedPaste),
    };
    
    return NextResponse.json<GetPasteResponse>(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching paste:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
