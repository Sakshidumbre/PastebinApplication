import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/auth';
import { getCurrentUser } from '@/lib/request-utils';
import type { ErrorResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse<any>> {
  try {
    const userId = await getCurrentUser(request);
    
    if (!userId) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json<ErrorResponse>(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

