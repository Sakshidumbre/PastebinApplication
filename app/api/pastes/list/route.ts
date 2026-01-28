import { NextRequest, NextResponse } from 'next/server';
import { listPastes } from '@/lib/kv';
import { getCurrentUser } from '@/lib/request-utils';
import type { ListPastesResponse, ErrorResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse<ListPastesResponse | ErrorResponse>> {
  try {
    const userId = await getCurrentUser(request);
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const pastes = await listPastes(userId || undefined, limit, offset);

    const formattedPastes = pastes.map(paste => ({
      id: paste.id,
      title: paste.title,
      syntax: paste.syntax,
      createdAt: paste.createdAt,
      viewCount: paste.viewCount,
      privacy: paste.privacy,
      expires_at: paste.ttlSeconds 
        ? new Date(paste.createdAt + paste.ttlSeconds * 1000).toISOString()
        : null,
    }));

    return NextResponse.json<ListPastesResponse>({
      pastes: formattedPastes,
      total: formattedPastes.length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error listing pastes:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

