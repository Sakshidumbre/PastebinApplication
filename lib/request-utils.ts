import { NextRequest } from 'next/server';
import { getUserIdFromSession } from './auth';
import { headers } from 'next/headers';

export function getTestTime(request: NextRequest): number {
  const testMode = process.env.TEST_MODE === '1';
  const testNowMs = request.headers.get('x-test-now-ms');
  
  if (testMode && testNowMs) {
    const parsed = parseInt(testNowMs, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  return Date.now();
}

export function getBaseUrl(request: NextRequest): string {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('host');
  
  if (!host) {
    throw new Error('Host header is required');
  }
  
  const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

export async function getCurrentUser(request: NextRequest): Promise<string | null> {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return null;
  }
  
  return await getUserIdFromSession(sessionId);
}

export async function getCurrentUserFromHeaders(): Promise<string | null> {
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie');
  if (!cookieHeader) {
    return null;
  }
  
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...valueParts] = c.split('=');
      return [key, valueParts.join('=')];
    })
  );
  
  const sessionId = cookies.session;
  if (!sessionId) {
    return null;
  }
  
  return await getUserIdFromSession(sessionId);
}
