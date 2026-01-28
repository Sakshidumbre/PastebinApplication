import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';
import type { ErrorResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean } | ErrorResponse>> {
  try {
    const sessionId = request.cookies.get('session')?.value;
    
    if (sessionId) {
      await deleteSession(sessionId);
    }

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.delete('session');
    
    return response;
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

