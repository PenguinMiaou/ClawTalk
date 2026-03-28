import * as cheerio from 'cheerio';
import { getRedis } from '../config/redis';
import { InfoItem } from './types';
import { createHash } from 'crypto';

const SEARCH_TIMEOUT = 5000;

function queryHash(q: string): string {
  return createHash('md5').update(q.toLowerCase().trim()).digest('hex').slice(0, 12);
}

function isChinese(q: string): boolean {
  return /[\u4e00-\u9fff]/.test(q);
}

async function searchDDG(q: string): Promise<InfoItem[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 ClawTalk/1.0' },
      signal: controller.signal,
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const items: InfoItem[] = [];
    $('.result').each((index, el) => {
      if (index >= 10) return false;
      const title = $(el).find('.result__title a').text().trim();
      const link = $(el).find('.result__title a').attr('href') || '';
      const snippet = $(el).find('.result__snippet').text().trim();
      if (!title) return;

      items.push({
        id: `live_ddg_${index}_${queryHash(q)}`,
        provider: 'live_search',
        category: 'news',
        title,
        summary: snippet.slice(0, 200) || undefined,
        url: link.startsWith('//') ? `https:${link}` : link,
        tags: ['search', 'duckduckgo'],
        metrics: { rank: index + 1 },
        fetchedAt: new Date().toISOString(),
      });
    });
    return items;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function searchBaidu(q: string): Promise<InfoItem[]> {
  const url = `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      signal: controller.signal,
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const items: InfoItem[] = [];
    $('.result, .c-container').each((index, el) => {
      if (index >= 10) return false;
      const title = $(el).find('h3 a').text().trim();
      const link = $(el).find('h3 a').attr('href') || '';
      const snippet = $(el).find('.c-abstract, .content-right_8Zs40').text().trim();
      if (!title) return;

      items.push({
        id: `live_baidu_${index}_${queryHash(q)}`,
        provider: 'live_search',
        category: 'news',
        title,
        summary: snippet.slice(0, 200) || undefined,
        url: link,
        tags: ['search', 'baidu'],
        metrics: { rank: index + 1 },
        fetchedAt: new Date().toISOString(),
      });
    });
    return items;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function liveSearch(q: string): Promise<InfoItem[]> {
  const redis = getRedis();
  const hash = queryHash(q);
  const cacheKey = `info:live:${hash}`;

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const searches = isChinese(q)
    ? [searchBaidu(q), searchDDG(q)]
    : [searchDDG(q)];

  const results = await Promise.all(searches);
  const allItems = results.flat();

  const seen = new Set<string>();
  const unique = allItems.filter(item => {
    const key = item.title.toLowerCase().slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);

  if (redis && unique.length > 0) {
    await redis.set(cacheKey, JSON.stringify(unique), 'EX', 300);
  }

  return unique;
}

export async function checkLiveSearchQuota(agentId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const redis = getRedis();
  if (!redis) return { allowed: true, used: 0, limit: 20 };

  const key = `info:live:daily:${agentId}`;
  const used = parseInt(await redis.get(key) || '0', 10);
  return { allowed: used < 20, used, limit: 20 };
}

export async function incrementLiveSearchCount(agentId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = `info:live:daily:${agentId}`;
  await redis.incr(key);

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const ttl = Math.ceil((endOfDay.getTime() - now.getTime()) / 1000);
  await redis.expire(key, ttl);
}
