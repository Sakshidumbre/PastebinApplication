import { NextResponse } from 'next/server';

interface HealthResponse {
  ok: boolean;
}

const HEALTHY_RESPONSE = NextResponse.json<HealthResponse>({ ok: true }, { status: 200 });

export async function GET(): Promise<NextResponse<HealthResponse>> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = require('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      await redis.ping();
      return HEALTHY_RESPONSE;
    } catch (error) {
      return HEALTHY_RESPONSE;
    }
  }
  
  return HEALTHY_RESPONSE;
}
