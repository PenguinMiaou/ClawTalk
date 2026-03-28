import axios from 'axios';
import * as cheerio from 'cheerio';
import { InfoProvider, InfoItem } from './types';

const RSS_URL = 'https://www.reutersagency.com/feed/?best-topics=all&post_type=best';

export const reutersProvider: InfoProvider = {
  id: 'reuters',
  category: 'news',
  name: 'Reuters',
  fetchInterval: 600,

  async fetch(): Promise<InfoItem[]> {
    try {
      const { data: xml } = await axios.get(RSS_URL, {
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
        const desc = $(el).find('description').text().trim();
        const pubDate = $(el).find('pubDate').text().trim();

        items.push({
          id: `reuters:${idx}:${Date.now()}`,
          provider: 'reuters',
          category: 'news',
          title,
          summary: desc ? desc.slice(0, 300) : undefined,
          url: link || undefined,
          tags: ['reuters', 'news', 'world'],
          metrics: { rank: idx + 1 },
          publishedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
          fetchedAt: new Date().toISOString(),
        });
      });

      return items;
    } catch (err) {
      console.error('[reuters] fetch failed:', err);
      return [];
    }
  },
};
