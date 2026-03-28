import axios from 'axios';
import * as cheerio from 'cheerio';
import { InfoProvider, InfoItem } from './types';

// Primary: Weibo AJAX hot search API (newer endpoint)
const WEIBO_AJAX_API = 'https://weibo.com/ajax/side/hotSearch';
// Fallback: mobile containerid API
const WEIBO_MOBILE_API =
  'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';

const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UA_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchFromAjaxAPI(): Promise<InfoItem[]> {
  const { data } = await axios.get(WEIBO_AJAX_API, {
    timeout: 10000,
    headers: {
      'User-Agent': UA_DESKTOP,
      Accept: 'application/json',
    },
  });

  const list = data?.data?.realtime;
  if (!Array.isArray(list) || list.length === 0) throw new Error('unexpected ajax structure');

  return list.slice(0, 30).map((item: any, idx: number) => ({
    id: `weibo-hot:${idx}:${Date.now()}`,
    provider: 'weibo-hot',
    category: 'social' as const,
    title: item.word || item.note || `#${idx + 1}`,
    url: item.word
      ? `https://s.weibo.com/weibo?q=${encodeURIComponent('#' + item.word + '#')}`
      : undefined,
    tags: ['weibo', 'hot', 'china', 'social'],
    metrics: {
      rank: idx + 1,
      heat: parseInt(item.raw_hot || item.num || '0', 10),
    },
    fetchedAt: new Date().toISOString(),
  }));
}

async function fetchFromMobileAPI(): Promise<InfoItem[]> {
  const { data } = await axios.get(WEIBO_MOBILE_API, {
    timeout: 10000,
    headers: { 'User-Agent': UA_MOBILE },
  });

  const cards = data?.data?.cards;
  if (!Array.isArray(cards)) throw new Error('unexpected mobile structure');

  const items: InfoItem[] = [];
  let rank = 0;

  for (const card of cards) {
    const groups = card.card_group;
    if (!Array.isArray(groups)) continue;

    for (const g of groups) {
      const title = g.desc || g.title_sub;
      if (!title) continue;
      rank++;
      if (rank > 30) break;

      items.push({
        id: `weibo-hot:${rank}:${Date.now()}`,
        provider: 'weibo-hot',
        category: 'social',
        title,
        url: g.scheme || `https://s.weibo.com/weibo?q=${encodeURIComponent(title)}`,
        tags: ['weibo', 'hot', 'china', 'social'],
        metrics: { rank },
        fetchedAt: new Date().toISOString(),
      });
    }
    if (rank > 30) break;
  }

  return items;
}

async function fetchFromHTML(): Promise<InfoItem[]> {
  const { data: html } = await axios.get('https://s.weibo.com/top/summary', {
    timeout: 10000,
    headers: {
      'User-Agent': UA_DESKTOP,
      Cookie: 'SUB=_2AkMRhKmef8NxqwFRmP8Ry2vlaY1wwwzEieKnRpJjRcx',
    },
  });

  const $ = cheerio.load(html);
  const items: InfoItem[] = [];

  $('td.td-02 a').each((idx, el) => {
    if (idx >= 30) return false;
    const title = $(el).text().trim();
    if (!title) return;
    const href = $(el).attr('href');
    items.push({
      id: `weibo-hot:html-${idx}:${Date.now()}`,
      provider: 'weibo-hot',
      category: 'social',
      title,
      url: href ? `https://s.weibo.com${href}` : undefined,
      tags: ['weibo', 'hot', 'china', 'social'],
      metrics: { rank: idx + 1 },
      fetchedAt: new Date().toISOString(),
    });
  });

  return items;
}

export const weiboHotProvider: InfoProvider = {
  id: 'weibo-hot',
  category: 'social',
  name: 'Weibo Hot Search',
  fetchInterval: 300,

  async fetch(): Promise<InfoItem[]> {
    // Try AJAX API first (most reliable)
    try {
      const items = await fetchFromAjaxAPI();
      if (items.length > 0) return items;
    } catch (err) {
      console.warn('[weibo-hot] AJAX API failed:', err);
    }

    // Try mobile API
    try {
      const items = await fetchFromMobileAPI();
      if (items.length > 0) return items;
    } catch (err) {
      console.warn('[weibo-hot] mobile API failed:', err);
    }

    // Fallback: scrape HTML
    try {
      const items = await fetchFromHTML();
      if (items.length > 0) return items;
    } catch (err) {
      console.error('[weibo-hot] all methods failed:', err);
    }

    return [];
  },
};
