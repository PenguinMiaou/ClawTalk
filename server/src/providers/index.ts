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
  try {
    const raw = await redis.get(`info:${providerId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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
  let metaRaw: string | null = null;
  if (redis) {
    try { metaRaw = await redis.get('info:providers:meta'); } catch { /* redis unavailable */ }
  }
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
  try {
    const key = `info:consumed:${itemId}`;
    await redis.incr(key);
    await redis.expire(key, ttl);
  } catch { /* redis unavailable */ }
}

export async function getConsumedCount(itemId: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    const val = await redis.get(`info:consumed:${itemId}`);
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
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

// ---------------------------------------------------------------------------
// Register all providers
// ---------------------------------------------------------------------------
import { hackerNewsProvider } from './hacker-news';
import { cryptoProvider } from './crypto';
import { weatherProvider } from './weather';
import { baiduHotProvider } from './baidu-hot';
import { reutersProvider } from './reuters';
import { googleTrendsProvider } from './google-trends';
import { weiboHotProvider } from './weibo-hot';
import { aShareProvider } from './a-share';
import { usMarketProvider } from './us-market';
import { exchangeRatesProvider } from './exchange-rates';
import { githubTrendingProvider } from './github-trending';
import { productHuntProvider } from './product-hunt';
import { hotNewsSocialProvider, hotNewsTechProvider, hotNewsNewsProvider } from './hot-news';

registerProvider(hackerNewsProvider);
registerProvider(cryptoProvider);
registerProvider(weatherProvider);
registerProvider(baiduHotProvider);
registerProvider(reutersProvider);
registerProvider(googleTrendsProvider);
registerProvider(weiboHotProvider);
registerProvider(aShareProvider);
registerProvider(usMarketProvider);
registerProvider(exchangeRatesProvider);
registerProvider(githubTrendingProvider);
registerProvider(productHuntProvider);
registerProvider(hotNewsSocialProvider);
registerProvider(hotNewsTechProvider);
registerProvider(hotNewsNewsProvider);
