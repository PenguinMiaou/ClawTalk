import axios from 'axios';
import * as cheerio from 'cheerio';
import { InfoProvider, InfoItem } from './types';

const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UA_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const baiduHotProvider: InfoProvider = {
  id: 'baidu-hot',
  category: 'news',
  name: 'Baidu Hot Search',
  fetchInterval: 300,

  async fetch(): Promise<InfoItem[]> {
    // Try mobile API first (most reliable)
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
        'User-Agent': UA_MOBILE,
        Accept: 'application/json',
      },
    },
  );

  // Response structure: data.cards is an array, first card has content
  // Also try data.data.cards for nested structure variations
  let content: any[] | undefined;

  if (data?.data?.cards?.[0]?.content) {
    content = data.data.cards[0].content;
  } else if (Array.isArray(data?.data?.cards)) {
    // Flatten all cards' content arrays
    content = data.data.cards.flatMap((card: any) => card.content || []);
  } else if (data?.cards?.[0]?.content) {
    content = data.cards[0].content;
  }

  if (!Array.isArray(content) || content.length === 0) {
    throw new Error(`unexpected API structure: keys=${Object.keys(data?.data || data || {})}`);
  }

  return content.slice(0, 30).map((item: any, idx: number) => ({
    id: `baidu-hot:${item.word || idx}:${Date.now()}`,
    provider: 'baidu-hot',
    category: 'news' as const,
    title: item.word || item.query || `#${idx + 1}`,
    summary: item.desc || undefined,
    url:
      item.url ||
      item.rawUrl ||
      `https://www.baidu.com/s?wd=${encodeURIComponent(item.word || '')}`,
    tags: ['baidu', 'hot', 'china'],
    metrics: {
      rank: idx + 1,
      heat: parseInt(item.hotScore || item.index || item.hot_score || '0', 10),
    },
    fetchedAt: new Date().toISOString(),
  }));
}

async function fetchFromHTML(): Promise<InfoItem[]> {
  const { data: html } = await axios.get('https://top.baidu.com/board?tab=realtime', {
    timeout: 10000,
    headers: { 'User-Agent': UA_DESKTOP },
  });

  const $ = cheerio.load(html);
  const items: InfoItem[] = [];

  // Try multiple selector strategies — Baidu changes class names
  // Strategy 1: Look for the SSR JSON data in script tags
  const scripts = $('script').toArray();
  for (const script of scripts) {
    const text = $(script).html() || '';
    // Baidu embeds initial data as JSON in a script tag
    const jsonMatch = text.match(/window\.__INITIAL_DATA__\s*=\s*({.+?});?\s*(?:<\/script>|$)/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        const cards = parsed?.cards || parsed?.data?.cards;
        if (Array.isArray(cards)) {
          const content = cards[0]?.content || cards.flatMap((c: any) => c.content || []);
          if (Array.isArray(content) && content.length > 0) {
            return content.slice(0, 30).map((item: any, idx: number) => ({
              id: `baidu-hot:ssr-${idx}:${Date.now()}`,
              provider: 'baidu-hot',
              category: 'news' as const,
              title: item.word || item.query || `#${idx + 1}`,
              summary: item.desc || undefined,
              url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.word || '')}`,
              tags: ['baidu', 'hot', 'china'],
              metrics: {
                rank: idx + 1,
                heat: parseInt(item.hotScore || item.index || '0', 10) || 0,
              },
              fetchedAt: new Date().toISOString(),
            }));
          }
        }
      } catch {
        // JSON parse failed, continue to DOM selectors
      }
    }
  }

  // Strategy 2: DOM selectors (multiple variations)
  const selectors = [
    '.category-wrap_iQLoo .content_1YWBm',
    '[class*="category-wrap"] [class*="content"]',
    '.trend-card-bg_cut-card-item',
    '.c-single-text-ellipsis',
  ];

  for (const selector of selectors) {
    $(selector).each((idx, el) => {
      if (idx >= 30) return false;
      // Try to find the title text — could be in child or self
      let title =
        $(el).find('.c-single-text-ellipsis').text().trim() ||
        $(el).find('[class*="ellipsis"]').text().trim() ||
        $(el).text().trim();
      if (!title) return;
      // Clean up — remove leading rank numbers
      title = title.replace(/^\d+\s*/, '');
      if (!title) return;

      const heat =
        $(el).find('[class*="hot-index"]').text().trim() ||
        $(el).find('[class*="hotScore"]').text().trim() ||
        '';

      items.push({
        id: `baidu-hot:html-${idx}:${Date.now()}`,
        provider: 'baidu-hot',
        category: 'news',
        title,
        url: `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
        tags: ['baidu', 'hot', 'china'],
        metrics: {
          rank: idx + 1,
          heat:
            parseInt(heat.replace(/万/, '0000').replace(/亿/, '00000000'), 10) ||
            0,
        },
        fetchedAt: new Date().toISOString(),
      });
    });

    if (items.length > 0) break;
  }

  return items.slice(0, 30);
}
