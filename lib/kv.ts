import type { Paste } from './types';
import { addPasteToUser } from './auth';

const PREFIX = 'paste:';
const PASTE_INDEX_PREFIX = 'paste_index:';
const MEMORY_STORE_CLEANUP_THRESHOLD = 100;
let memoryStoreOps = 0;

const memoryStore = new Map<string, { paste: Paste; expiresAt?: number }>();
const memoryPasteIndex = new Set<string>();

let redis: any = null;
let redisAvailable = false;
let redisInitialized = false;

async function getRedis(): Promise<any> {
  if (redisInitialized) {
    return redisAvailable ? redis : null;
  }
  
  redisInitialized = true;
  
  try {
    // Use dynamic import for faster loading
    const { Redis } = await import('@upstash/redis');
    
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = Redis.fromEnv();
      redisAvailable = true;
      return redis;
    }
    
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      redis = new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
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
  
  const redisInstance = await getRedis();
  if (redisInstance && redisAvailable) {
    try {
      const data = await redisInstance.get(key) as Paste | null;
      if (!data) {
        return null;
      }
      
      // Only check if paste has expired (TTL)
      // Don't check maxViews or burnAfterRead here - those are business logic checks
      // that should be done via isPasteAvailable() before allowing new views
      if (data.ttlSeconds) {
        const elapsedSeconds = Math.floor((time - data.createdAt) / 1000);
        if (elapsedSeconds >= data.ttlSeconds) {
          return null;
        }
      }
      
      return data;
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
  
  const redisInstance = await getRedis();
  if (redisInstance && redisAvailable) {
    try {
      if (paste.ttlSeconds) {
        await redisInstance.setex(key, paste.ttlSeconds, paste);
      } else {
        await redisInstance.set(key, paste);
      }
      
      if (paste.privacy === 'public' || paste.privacy === undefined) {
        await redisInstance.zadd(`${PASTE_INDEX_PREFIX}public`, currentTime, paste.id);
      }
      
      if (paste.userId) {
        await addPasteToUser(paste.userId, paste.id);
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
  if (paste.privacy === 'public' || paste.privacy === undefined) {
    memoryPasteIndex.add(paste.id);
  }
}

export async function incrementViewCount(id: string, currentTime?: number): Promise<void> {
  const timeToUse = currentTime ?? Date.now();
  const key = `${PREFIX}${id}`;
  
  const redisInstance = await getRedis();
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
          await redisInstance.setex(key, remainingSeconds, paste);
        } else {
          await redisInstance.set(key, paste);
        }
      } else {
        await redisInstance.set(key, paste);
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

export async function listPastes(userId?: string, limit = 50, offset = 0): Promise<Paste[]> {
  const redisInstance = await getRedis();
  const pastes: Paste[] = [];
  
  if (redisInstance && redisAvailable) {
    try {
      if (userId) {
        const pasteIds = await redisInstance.smembers(`user_pastes:${userId}`) as string[];
        const pastePromises = pasteIds.slice(offset, offset + limit).map(async (id: string) => {
          return await getPaste(id);
        });
        const results = await Promise.all(pastePromises);
        return results.filter((p): p is Paste => p !== null);
      } else {
        const pasteIds = await redisInstance.zrevrange(`${PASTE_INDEX_PREFIX}public`, offset, offset + limit - 1) as string[];
        const pastePromises = pasteIds.map(async (id: string) => {
          return await getPaste(id);
        });
        const results = await Promise.all(pastePromises);
        return results.filter((p): p is Paste => p !== null && (p.privacy === 'public' || p.privacy === undefined));
      }
    } catch (error) {
      console.error('Error listing pastes from Redis:', error);
      redisAvailable = false;
    }
  }
  
  if (userId) {
    const allPastes = Array.from(memoryStore.values())
      .map(entry => entry.paste)
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);
    return allPastes;
  } else {
    const allPastes = Array.from(memoryStore.values())
      .map(entry => entry.paste)
      .filter(p => p.privacy === 'public' || p.privacy === undefined)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);
    return allPastes;
  }
}
