import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import type { AuthResponse, ErrorResponse, UserLoginRequest } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse | ErrorResponse>> {
  try {
    const body = await request.json() as UserLoginRequest;
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json<ErrorResponse>(
        { error: 'email and password are required' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email.toLowerCase());
    if (!user) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const sessionId = await createSession(user.id);

    const response = NextResponse.json<AuthResponse>({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token: sessionId,
    }, { status: 200 });

    response.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

