import type { Paste } from './types';

const PREFIX = 'paste:';
const MEMORY_STORE_CLEANUP_THRESHOLD = 100;
let memoryStoreOps = 0;

const memoryStore = new Map<string, { paste: Paste; expiresAt?: number }>();

let redis: any = null;
let redisAvailable = false;
let redisInitialized = false;

function getRedis(): any {
  if (redisInitialized) {
    return redisAvailable ? redis : null;
  }
  
  redisInitialized = true;
  
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const { Redis } = require('@upstash/redis');
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      redisAvailable = true;
      return redis;
    }
  } catch (error) {
    redisAvailable = false;
  }
  
  return null;
}

function isExpired(entry: { paste: Paste; expiresAt?: number }, currentTime: number): boolean {
  if (entry.expiresAt && currentTime >= entry.expiresAt) {
    return true;
  }
  return false;
}

function cleanupMemoryStore(currentTime: number, force = false): void {
  memoryStoreOps++;
  
  if (!force && memoryStoreOps < MEMORY_STORE_CLEANUP_THRESHOLD) {
    return;
  }
  
  memoryStoreOps = 0;
  const keysToDelete: string[] = [];
  
  memoryStore.forEach((entry, key) => {
    if (isExpired(entry, currentTime)) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => memoryStore.delete(key));
}

export async function getPaste(id: string, currentTime?: number): Promise<Paste | null> {
  const time = currentTime ?? Date.now();
  const key = `${PREFIX}${id}`;
  
  const redisInstance = getRedis();
  if (redisInstance && redisAvailable) {
    try {
      const data = await redisInstance.get(key);
      if (data === null) {
        return null;
      }
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      console.error('Error fetching paste from Redis, falling back to memory:', error);
      redisAvailable = false;
    }
  }
  
  cleanupMemoryStore(time);
  const entry = memoryStore.get(key);
  
  if (!entry) {
    return null;
  }
  
  if (isExpired(entry, time)) {
    memoryStore.delete(key);
    return null;
  }
  
  return entry.paste;
}

export async function createPaste(paste: Paste, createdAt?: number): Promise<void> {
  const currentTime = createdAt ?? Date.now();
  const key = `${PREFIX}${paste.id}`;
  
  const redisInstance = getRedis();
  if (redisInstance && redisAvailable) {
    try {
      if (paste.ttlSeconds) {
        await redisInstance.setex(key, paste.ttlSeconds, JSON.stringify(paste));
      } else {
        await redisInstance.set(key, JSON.stringify(paste));
      }
      return;
    } catch (error) {
      console.error('Error creating paste in Redis, falling back to memory:', error);
      redisAvailable = false;
    }
  }
  
  const expiresAt = paste.ttlSeconds 
    ? currentTime + (paste.ttlSeconds * 1000)
    : undefined;
  
  memoryStore.set(key, { paste, expiresAt });
}

export async function incrementViewCount(id: string, currentTime?: number): Promise<void> {
  const timeToUse = currentTime ?? Date.now();
  const key = `${PREFIX}${id}`;
  
  const redisInstance = getRedis();
  if (redisInstance && redisAvailable) {
    try {
      const paste = await getPaste(id, timeToUse);
      if (!paste) {
        return;
      }
      
      paste.viewCount += 1;
      
      if (paste.ttlSeconds) {
        const elapsed = timeToUse - paste.createdAt;
        const remainingSeconds = Math.max(0, Math.floor((paste.ttlSeconds * 1000 - elapsed) / 1000));
        if (remainingSeconds > 0) {
          await redisInstance.setex(key, remainingSeconds, JSON.stringify(paste));
        } else {
          await redisInstance.set(key, JSON.stringify(paste));
        }
      } else {
        await redisInstance.set(key, JSON.stringify(paste));
      }
      return;
    } catch (error) {
      console.error('Error incrementing view count in Redis, falling back to memory:', error);
      redisAvailable = false;
    }
  }
  
  cleanupMemoryStore(timeToUse);
  const entry = memoryStore.get(key);
  
  if (!entry || isExpired(entry, timeToUse)) {
    if (entry) {
      memoryStore.delete(key);
    }
    return;
  }
  
  entry.paste.viewCount += 1;
  
  if (entry.paste.ttlSeconds) {
    entry.expiresAt = entry.paste.createdAt + (entry.paste.ttlSeconds * 1000);
  }
  
  memoryStore.set(key, entry);
}
