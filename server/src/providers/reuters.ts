import axios from 'axios';
import * as cheerio from 'cheerio';
import { InfoProvider, InfoItem } from './types';

// Reuters Arc outbound feed — public RSS endpoint
const REUTERS_RSS = 'https://www.reuters.com/arc/outboundfeeds/v3/all/?outputType=xml&size=20';
// Fallback: NPR News RSS (reliable, similar coverage)
const NPR_RSS = 'https://feeds.npr.org/1001/rss.xml';

async function fetchFromRSS(url: string, providerTag: string): Promise<InfoItem[]> {
  const { data: xml } = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
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
      summary: desc ? desc.replace(/<[^>]+>/g, '').slice(0, 300) : undefined,
      url: link || undefined,
      tags: [providerTag, 'news', 'world'],
      metrics: { rank: idx + 1 },
      publishedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
      fetchedAt: new Date().toISOString(),
    });
  });

  return items;
}

export const reutersProvider: InfoProvider = {
  id: 'reuters',
  category: 'news',
  name: 'Reuters',
  fetchInterval: 600,

  async fetch(): Promise<InfoItem[]> {
    // Try Reuters Arc RSS first
    try {
      const items = await fetchFromRSS(REUTERS_RSS, 'reuters');
      if (items.length > 0) return items;
    } catch (err) {
      console.warn('[reuters] Reuters RSS failed, trying BBC fallback:', err);
    }

    // Fallback: NPR News RSS
    try {
      const items = await fetchFromRSS(NPR_RSS, 'npr');
      if (items.length > 0) return items;
    } catch (err) {
      console.error('[reuters] NPR fallback also failed:', err);
    }

    return [];
  },
};
