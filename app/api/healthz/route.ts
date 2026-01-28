import { NextResponse } from 'next/server';

interface HealthResponse {
  ok: boolean;
}

const HEALTHY_RESPONSE = NextResponse.json<HealthResponse>({ ok: true }, { status: 200 });

export async function GET(): Promise<NextResponse<HealthResponse>> {
  try {
    const { Redis } = require('@upstash/redis');
    
    let redisInstance;
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisInstance = Redis.fromEnv();
    } else if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      redisInstance = new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      });
    } else {
      return HEALTHY_RESPONSE;
    }
    
    await redisInstance.ping();
    return HEALTHY_RESPONSE;
  } catch (error) {
    return HEALTHY_RESPONSE;
  }
}
