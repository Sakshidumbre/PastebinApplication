import { NextRequest } from 'next/server';

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
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}
