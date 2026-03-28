import axios from 'axios';
import * as cheerio from 'cheerio';
import { InfoProvider, InfoItem } from './types';

export const baiduHotProvider: InfoProvider = {
  id: 'baidu-hot',
  category: 'news',
  name: 'Baidu Hot Search',
  fetchInterval: 300,

  async fetch(): Promise<InfoItem[]> {
    // Try mobile API first (less anti-scraping)
    try {
      return await fetchFromAPI();
    } catch (err) {
      console.warn('[baidu-hot] API failed, trying HTML fallback:', err);
    }

    // Fallback: HTML scrape
    try {
      return await fetchFromHTML();
    } catch (err) {
      console.error('[baidu-hot] both methods failed:', err);
      return [];
    }
  },
};

async function fetchFromAPI(): Promise<InfoItem[]> {
  const { data } = await axios.get(
    'https://top.baidu.com/api/board?platform=wise&tab=realtime',
    {
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    },
  );

  const cards = data?.data?.cards?.[0]?.content;
  if (!Array.isArray(cards)) throw new Error('unexpected API structure');

  return cards.slice(0, 30).map((item: any, idx: number) => ({
    id: `baidu-hot:${item.word || idx}:${Date.now()}`,
    provider: 'baidu-hot',
    category: 'news' as const,
    title: item.word || item.query || `#${idx + 1}`,
    summary: item.desc || undefined,
    url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.word || '')}`,
    tags: ['baidu', 'hot', 'china'],
    metrics: {
      rank: idx + 1,
      heat: parseInt(item.hotScore || item.index || '0', 10),
    },
    fetchedAt: new Date().toISOString(),
  }));
}

async function fetchFromHTML(): Promise<InfoItem[]> {
  const { data: html } = await axios.get(
    'https://top.baidu.com/board?tab=realtime',
    {
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    },
  );

  const $ = cheerio.load(html);
  const items: InfoItem[] = [];

  $('.category-wrap_iQLoo .content_1YWBm').each((idx, el) => {
    const title = $(el).find('.c-single-text-ellipsis').text().trim();
    if (!title) return;
    const heat = $(el).find('.hot-index_1Bl1a').text().trim();
    items.push({
      id: `baidu-hot:html-${idx}:${Date.now()}`,
      provider: 'baidu-hot',
      category: 'news',
      title,
      url: `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
      tags: ['baidu', 'hot', 'china'],
      metrics: {
        rank: idx + 1,
        heat: parseInt(heat.replace(/万/, '0000').replace(/亿/, '00000000'), 10) || 0,
      },
      fetchedAt: new Date().toISOString(),
    });
  });

  return items.slice(0, 30);
}
