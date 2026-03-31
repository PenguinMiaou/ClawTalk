import axios from 'axios';
import { InfoProvider, InfoItem, InfoCategory } from './types';

const BASE_URL = 'https://orz.ai/api/v1/dailynews';

interface HotNewsItem {
  title: string;
  url: string;
  content: string | null;
  source: string;
  publish_time: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  zhihu: '知乎',
  bilibili: 'B站',
  douyin: '抖音',
  douban: '豆瓣',
  tieba: '贴吧',
  hupu: '虎扑',
  juejin: '掘金',
  vtex: 'V2EX',
  tskr: '36氪',
  sspai: '少数派',
  jinritoutiao: '今日头条',
  tenxunwang: '腾讯新闻',
};

async function fetchPlatforms(
  platforms: string[],
  providerId: string,
  category: InfoCategory,
): Promise<InfoItem[]> {
  const { data: resp } = await axios.get(`${BASE_URL}/multi`, {
    params: { platforms: platforms.join(',') },
    timeout: 15000,
  });

  if (resp.status !== '200' || !resp.data) {
    throw new Error(`hot-news API error: ${resp.msg || 'unknown'}`);
  }

  const now = new Date().toISOString();
  const items: InfoItem[] = [];

  for (const platform of platforms) {
    const list: HotNewsItem[] = resp.data[platform] || [];
    for (let i = 0; i < Math.min(list.length, 15); i++) {
      const item = list[i];
      if (!item.title) continue;
      items.push({
        id: `${providerId}:${platform}:${i}`,
        provider: providerId,
        category,
        title: item.title,
        summary: item.content || undefined,
        url: item.url || undefined,
        tags: [platform, PLATFORM_LABELS[platform] || platform],
        metrics: { rank: i + 1 },
        publishedAt: item.publish_time || undefined,
        fetchedAt: now,
      });
    }
  }

  return items;
}

export const hotNewsSocialProvider: InfoProvider = {
  id: 'hot-news-social',
  category: 'social',
  name: 'Hot News Social (知乎/B站/抖音/豆瓣/贴吧/虎扑)',
  fetchInterval: 600,

  async fetch(): Promise<InfoItem[]> {
    try {
      return await fetchPlatforms(
        ['zhihu', 'bilibili', 'douyin', 'douban', 'tieba', 'hupu'],
        'hot-news-social',
        'social',
      );
    } catch (err) {
      console.error('[hot-news-social] fetch failed:', err);
      return [];
    }
  },
};

export const hotNewsTechProvider: InfoProvider = {
  id: 'hot-news-tech',
  category: 'tech',
  name: 'Hot News Tech (掘金/V2EX/36氪/少数派)',
  fetchInterval: 900,

  async fetch(): Promise<InfoItem[]> {
    try {
      return await fetchPlatforms(
        ['juejin', 'vtex', 'tskr', 'sspai'],
        'hot-news-tech',
        'tech',
      );
    } catch (err) {
      console.error('[hot-news-tech] fetch failed:', err);
      return [];
    }
  },
};

export const hotNewsNewsProvider: InfoProvider = {
  id: 'hot-news-news',
  category: 'news',
  name: 'Hot News CN (今日头条/腾讯新闻)',
  fetchInterval: 600,

  async fetch(): Promise<InfoItem[]> {
    try {
      return await fetchPlatforms(
        ['jinritoutiao', 'tenxunwang'],
        'hot-news-news',
        'news',
      );
    } catch (err) {
      console.error('[hot-news-news] fetch failed:', err);
      return [];
    }
  },
};
