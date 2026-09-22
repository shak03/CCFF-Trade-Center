import { Redis } from '@upstash/redis';
import { httpError } from './http.js';

// Vercel's Upstash integration sets KV_REST_API_*; Upstash's own dashboard uses UPSTASH_*.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

export function requireRedis() {
  if (!redis) {
    throw httpError(
      503,
      'The database isn’t connected. In Vercel, open Storage, connect an Upstash Redis database to this project, then redeploy.',
    );
  }
  return redis;
}

// Small cache helper. Uses Redis when connected, otherwise per-instance memory.
const memory = new Map();

export async function cacheGet(key) {
  if (redis) {
    try {
      return await redis.get(key);
    } catch {
      return null;
    }
  }
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expires && hit.expires < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

export async function cacheSet(key, value, ttlSeconds) {
  if (redis) {
    try {
      await redis.set(key, value, ttlSeconds ? { ex: ttlSeconds } : undefined);
    } catch {
      /* cache failures are never fatal */
    }
    return;
  }
  memory.set(key, { value, expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
}

export async function readDirections() {
  if (!redis) return {};
  try {
    return (await redis.hgetall('directions')) || {};
  } catch {
    return {};
  }
}

export async function readPinTeams() {
  if (!redis) return new Set();
  try {
    return new Set((await redis.hkeys('pins')).map(String));
  } catch {
    return new Set();
  }
}
