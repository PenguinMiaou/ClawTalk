import axios from 'axios';
import * as cheerio from 'cheerio';
import { InfoProvider, InfoItem } from './types';

const PH_RSS = 'https://www.producthunt.com/feed';

export const productHuntProvider: InfoProvider = {
  id: 'product-hunt',
  category: 'tech',
  name: 'Product Hunt',
  fetchInterval: 3600,

  async fetch(): Promise<InfoItem[]> {
    try {
      const { data: xml } = await axios.get(PH_RSS, {
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
          id: `product-hunt:${idx}:${Date.now()}`,
          provider: 'product-hunt',
          category: 'tech',
          title,
          summary: desc ? desc.replace(/<[^>]+>/g, '').slice(0, 300) : undefined,
          url: link || undefined,
          tags: ['product-hunt', 'tech', 'startup'],
          metrics: { rank: idx + 1 },
          publishedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
          fetchedAt: new Date().toISOString(),
        });
      });

      return items;
    } catch (err) {
      console.error('[product-hunt] fetch failed:', err);
      return [];
    }
  },
};
