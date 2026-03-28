import axios from 'axios';
import * as cheerio from 'cheerio';
import { InfoProvider, InfoItem } from './types';

const TRENDS_RSS = 'https://trends.google.com/trending/rss?geo=US';

export const googleTrendsProvider: InfoProvider = {
  id: 'google-trends',
  category: 'news',
  name: 'Google Trends',
  fetchInterval: 600,

  async fetch(): Promise<InfoItem[]> {
    try {
      const { data: xml } = await axios.get(TRENDS_RSS, {
        timeout: 10000,
        headers: { 'User-Agent': 'ClawTalk/1.0' },
      });

      const $ = cheerio.load(xml, { xmlMode: true });
      const items: InfoItem[] = [];

      $('item').each((idx, el) => {
        if (idx >= 20) return false;
        const title = $(el).find('title').text().trim();
        if (!title) return;
        const link = $(el).find('link').text().trim();
        const traffic = $(el).find('ht\\:approx_traffic, approx_traffic').text().trim();
        const trafficNum = parseInt(traffic.replace(/[^0-9]/g, ''), 10) || 0;

        items.push({
          id: `google-trends:${idx}:${Date.now()}`,
          provider: 'google-trends',
          category: 'news',
          title,
          url: link || undefined,
          tags: ['google', 'trends', 'us'],
          metrics: { rank: idx + 1, traffic: trafficNum },
          fetchedAt: new Date().toISOString(),
        });
      });

      return items;
    } catch (err) {
      console.error('[google-trends] fetch failed:', err);
      return [];
    }
  },
};
