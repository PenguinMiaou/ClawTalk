import axios from 'axios';
import * as cheerio from 'cheerio';
import { InfoProvider, InfoItem } from './types';

const PH_RSS = 'https://www.producthunt.com/feed';
const PH_CATEGORY_RSS = 'https://www.producthunt.com/feed?category=tech';

// Fallback: Hacker News top stories (similar audience, always available)
const HN_TOP_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const HN_ITEM_URL = 'https://hacker-news.firebaseio.com/v0/item';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchFromProductHuntRSS(): Promise<InfoItem[]> {
  // Try both RSS URLs
  for (const url of [PH_RSS, PH_CATEGORY_RSS]) {
    try {
      const { data: xml } = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': UA },
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

      if (items.length > 0) return items;
    } catch {
      // try next URL
    }
  }

  throw new Error('all PH RSS feeds failed');
}

async function fetchFromHackerNews(): Promise<InfoItem[]> {
  const { data: ids } = await axios.get(HN_TOP_URL, {
    timeout: 10000,
    headers: { 'User-Agent': 'ClawTalk/1.0' },
  });

  if (!Array.isArray(ids)) throw new Error('unexpected HN structure');

  const top20 = ids.slice(0, 20);
  const items: InfoItem[] = [];

  // Fetch items in parallel (batches of 5)
  for (let i = 0; i < top20.length; i += 5) {
    const batch = top20.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((id: number) =>
        axios.get(`${HN_ITEM_URL}/${id}.json`, {
          timeout: 5000,
          headers: { 'User-Agent': 'ClawTalk/1.0' },
        }),
      ),
    );

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const story = r.value.data;
      if (!story?.title) continue;

      items.push({
        id: `product-hunt:hn-${story.id}`,
        provider: 'product-hunt',
        category: 'tech',
        title: story.title,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        tags: ['hacker-news', 'tech', 'startup'],
        metrics: {
          rank: items.length + 1,
          score: story.score || 0,
        },
        publishedAt: story.time
          ? new Date(story.time * 1000).toISOString()
          : undefined,
        fetchedAt: new Date().toISOString(),
      });
    }
  }

  return items;
}

export const productHuntProvider: InfoProvider = {
  id: 'product-hunt',
  category: 'tech',
  name: 'Product Hunt',
  fetchInterval: 3600,

  async fetch(): Promise<InfoItem[]> {
    // Try Product Hunt RSS first
    try {
      const items = await fetchFromProductHuntRSS();
      if (items.length > 0) return items;
    } catch (err) {
      console.warn('[product-hunt] PH RSS failed, trying Hacker News fallback:', err);
    }

    // Fallback: Hacker News (always works, similar audience)
    try {
      const items = await fetchFromHackerNews();
      if (items.length > 0) return items;
    } catch (err) {
      console.error('[product-hunt] all sources failed:', err);
    }

    return [];
  },
};
