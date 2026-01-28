import type { User } from './types';
import { generateId } from './utils';

const USER_PREFIX = 'user:';
const SESSION_PREFIX = 'session:';
const USER_PASTES_PREFIX = 'user_pastes:';

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

const memoryUsers = new Map<string, User>();
const memorySessions = new Map<string, string>();

export async function createUser(username: string, email: string, passwordHash: string): Promise<User> {
  const id = generateId();
  const user: User = {
    id,
    username,
    email,
    createdAt: Date.now(),
  };

  const redisInstance = await getRedis();
  if (redisInstance && redisAvailable) {
    try {
      await redisInstance.set(`${USER_PREFIX}${id}`, { ...user, passwordHash });
      await redisInstance.set(`${USER_PREFIX}email:${email}`, id);
      return user;
    } catch (error) {
      console.error('Error creating user in Redis, falling back to memory:', error);
      redisAvailable = false;
    }
  }

  memoryUsers.set(id, { ...user, passwordHash } as any);
  memoryUsers.set(`email:${email}`, id as any);
  return user;
}

export async function getUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const redisInstance = await getRedis();
  if (redisInstance && redisAvailable) {
    try {
      const userId = await redisInstance.get(`${USER_PREFIX}email:${email}`) as string | null;
      if (!userId) return null;
      const user = await redisInstance.get(`${USER_PREFIX}${userId}`) as (User & { passwordHash: string }) | null;
      return user;
    } catch (error) {
      console.error('Error fetching user from Redis:', error);
      redisAvailable = false;
    }
  }

  const userId = memoryUsers.get(`email:${email}`) as any;
  if (!userId) return null;
  return memoryUsers.get(userId) as (User & { passwordHash: string }) | null;
}

export async function getUserById(id: string): Promise<User | null> {
  const redisInstance = await getRedis();
  if (redisInstance && redisAvailable) {
    try {
      const user = await redisInstance.get(`${USER_PREFIX}${id}`) as User | null;
      if (user) {
        const { passwordHash, ...userWithoutPassword } = user as any;
        return userWithoutPassword;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user from Redis:', error);
      redisAvailable = false;
    }
  }

  const user = memoryUsers.get(id) as any;
  if (user) {
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  return null;
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = generateId() + generateId();
  
  const redisInstance = await getRedis();
  if (redisInstance && redisAvailable) {
    try {
      await redisInstance.setex(`${SESSION_PREFIX}${sessionId}`, 86400 * 30, userId);
      return sessionId;
    } catch (error) {
      console.error('Error creating session in Redis:', error);
      redisAvailable = false;
    }
  }

  memorySessions.set(sessionId, userId);
  return sessionId;
}

export async function getUserIdFromSession(sessionId: string): Promise<string | null> {
  const redisInstance = await getRedis();
  if (redisInstance && redisAvailable) {
    try {
      const userId = await redisInstance.get(`${SESSION_PREFIX}${sessionId}`) as string | null;
      return userId;
    } catch (error) {
      console.error('Error fetching session from Redis:', error);
      redisAvailable = false;
    }
  }

  return memorySessions.get(sessionId) || null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const redisInstance = await getRedis();
  if (redisInstance && redisAvailable) {
    try {
      await redisInstance.del(`${SESSION_PREFIX}${sessionId}`);
      return;
    } catch (error) {
      console.error('Error deleting session from Redis:', error);
      redisAvailable = false;
    }
  }

  memorySessions.delete(sessionId);
}

export async function addPasteToUser(userId: string, pasteId: string): Promise<void> {
  const redisInstance = await getRedis();
  if (redisInstance && redisAvailable) {
    try {
      await redisInstance.sadd(`${USER_PASTES_PREFIX}${userId}`, pasteId);
      return;
    } catch (error) {
      console.error('Error adding paste to user in Redis:', error);
      redisAvailable = false;
    }
  }
}

export async function getUserPastes(userId: string): Promise<string[]> {
  const redisInstance = await getRedis();
  if (redisInstance && redisAvailable) {
    try {
      const pasteIds = await redisInstance.smembers(`${USER_PASTES_PREFIX}${userId}`) as string[];
      return pasteIds || [];
    } catch (error) {
      console.error('Error fetching user pastes from Redis:', error);
      redisAvailable = false;
    }
  }

  return [];
}

