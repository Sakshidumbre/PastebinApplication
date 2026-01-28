import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, createSession } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import type { AuthResponse, ErrorResponse, UserRegisterRequest } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse | ErrorResponse>> {
  try {
    const body = await request.json() as UserRegisterRequest;
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json<ErrorResponse>(
        { error: 'username, email, and password are required' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json<ErrorResponse>(
        { error: 'username must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json<ErrorResponse>(
        { error: 'password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(username, email.toLowerCase(), passwordHash);
    const sessionId = await createSession(user.id);

    const response = NextResponse.json<AuthResponse>({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token: sessionId,
    }, { status: 201 });

    response.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

