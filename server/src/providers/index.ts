import * as cron from 'node-cron';
import { getRedis } from '../config/redis';
import { InfoProvider, InfoItem, ProviderMeta } from './types';

const providers: InfoProvider[] = [];
const cronJobs: cron.ScheduledTask[] = [];

export function registerProvider(provider: InfoProvider) {
  providers.push(provider);
}

export function getProviders(): InfoProvider[] {
  return providers;
}

async function fetchAndCache(provider: InfoProvider): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const items = await provider.fetch();
    const key = `info:${provider.id}`;
    const ttl = provider.fetchInterval * 3;

    await redis.set(key, JSON.stringify(items), 'EX', ttl);

    const metaKey = 'info:providers:meta';
    const metaRaw = await redis.get(metaKey);
    const meta: Record<string, { lastFetchAt: string; itemCount: number }> = metaRaw
      ? JSON.parse(metaRaw)
      : {};
    meta[provider.id] = {
      lastFetchAt: new Date().toISOString(),
      itemCount: items.length,
    };
    await redis.set(metaKey, JSON.stringify(meta));

    console.log(`[info] Fetched ${items.length} items from ${provider.id}`);
  } catch (err) {
    console.error(`[info] Failed to fetch ${provider.id}:`, err);
  }
}

export async function getCachedItems(providerId: string): Promise<InfoItem[]> {
  const redis = getRedis();
  if (!redis) return [];
  const raw = await redis.get(`info:${providerId}`);
  return raw ? JSON.parse(raw) : [];
}

export async function getAllCachedItems(categories?: string[]): Promise<InfoItem[]> {
  const items: InfoItem[] = [];
  for (const provider of providers) {
    if (categories && !categories.includes(provider.category)) continue;
    const cached = await getCachedItems(provider.id);
    items.push(...cached);
  }
  return items;
}

export async function getProvidersMeta(): Promise<ProviderMeta[]> {
  const redis = getRedis();
  const metaRaw = redis ? await redis.get('info:providers:meta') : null;
  const meta: Record<string, { lastFetchAt: string; itemCount: number }> = metaRaw
    ? JSON.parse(metaRaw)
    : {};

  return providers.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    fetchInterval: p.fetchInterval,
    lastFetchAt: meta[p.id]?.lastFetchAt || null,
    itemCount: meta[p.id]?.itemCount || 0,
  }));
}

export async function incrementConsumed(itemId: string, ttl: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const key = `info:consumed:${itemId}`;
  await redis.incr(key);
  await redis.expire(key, ttl);
}

export async function getConsumedCount(itemId: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  const val = await redis.get(`info:consumed:${itemId}`);
  return val ? parseInt(val, 10) : 0;
}

function intervalToCron(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `*/${minutes} * * * *`;
  const hours = Math.round(minutes / 60);
  return `0 */${hours} * * *`;
}

export function startInfoCrons(): void {
  if (process.env.NODE_ENV === 'test') return;

  for (const provider of providers) {
    fetchAndCache(provider);
    const cronExpr = intervalToCron(provider.fetchInterval);
    const job = cron.schedule(cronExpr, () => fetchAndCache(provider));
    cronJobs.push(job);
    console.log(`[info] Scheduled ${provider.id} at "${cronExpr}"`);
  }
}

export function stopInfoCrons(): void {
  for (const job of cronJobs) {
    job.stop();
  }
  cronJobs.length = 0;
}
