import axios from 'axios';
import { InfoProvider, InfoItem } from './types';

// 东方财富 push API — works from overseas, same data as their web app
const EASTMONEY_URL =
  'https://push2.eastmoney.com/api/qt/ulist.np/get?secids=1.000001,0.399001,0.399006,1.000300&fields=f2,f3,f4,f12,f14&fltt=2&invt=2';

const INDEX_META: Record<string, string> = {
  '000001': '上证指数',
  '399001': '深证成指',
  '399006': '创业板指',
  '000300': '沪深300',
};

async function fetchFromEastmoney(): Promise<InfoItem[]> {
  const { data } = await axios.get(EASTMONEY_URL, {
    timeout: 10000,
    headers: {
      'User-Agent': 'ClawTalk/1.0',
      Referer: 'https://quote.eastmoney.com/',
    },
  });

  const diffs = data?.data?.diff;
  if (!Array.isArray(diffs)) throw new Error('unexpected eastmoney structure');

  return diffs.map((d: any, idx: number) => {
    const code = d.f12 || '';
    const name = INDEX_META[code] || d.f14 || `Index ${idx}`;
    const price = d.f2 ?? 0; // current price
    const changePct = d.f3 ?? 0; // change percent
    const change = d.f4 ?? 0; // change amount

    return {
      id: `a-share:${code || idx}`,
      provider: 'a-share',
      category: 'finance' as const,
      title: `${name}: ${price.toFixed(2)} (${change >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`,
      tags: ['a-share', 'finance', 'china', 'stock'],
      metrics: {
        rank: idx + 1,
        price,
        change,
        change_pct: changePct,
      },
      fetchedAt: new Date().toISOString(),
    };
  });
}

// Fallback: Sina API (may fail from overseas)
async function fetchFromSina(): Promise<InfoItem[]> {
  const codes = ['s_sh000001', 's_sz399001', 's_sz399006', 's_sh000300'];
  const url = `https://hq.sinajs.cn/list=${codes.join(',')}`;

  const { data } = await axios.get(url, {
    timeout: 10000,
    headers: {
      Referer: 'https://finance.sina.com.cn/',
      'User-Agent': 'ClawTalk/1.0',
    },
    responseType: 'text',
  });

  const lines = (data as string).split('\n').filter((l: string) => l.trim());
  const items: InfoItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/="(.+)"/);
    if (!match) continue;
    const parts = match[1].split(',');
    const name = parts[0] || `Index ${i}`;
    const price = parseFloat(parts[1]) || 0;
    const change = parseFloat(parts[2]) || 0;
    const changePct = parseFloat(parts[3]) || 0;

    items.push({
      id: `a-share:${codes[i] || i}`,
      provider: 'a-share',
      category: 'finance',
      title: `${name}: ${price.toFixed(2)} (${change >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`,
      tags: ['a-share', 'finance', 'china', 'stock'],
      metrics: {
        rank: i + 1,
        price,
        change,
        change_pct: changePct,
      },
      fetchedAt: new Date().toISOString(),
    });
  }

  return items;
}

export const aShareProvider: InfoProvider = {
  id: 'a-share',
  category: 'finance',
  name: 'A-Share Indices',
  fetchInterval: 900,

  async fetch(): Promise<InfoItem[]> {
    // Primary: 东方财富 (works overseas)
    try {
      const items = await fetchFromEastmoney();
      if (items.length > 0) return items;
    } catch (err) {
      console.warn('[a-share] Eastmoney failed, trying Sina fallback:', err);
    }

    // Fallback: Sina (may be blocked overseas)
    try {
      const items = await fetchFromSina();
      if (items.length > 0) return items;
    } catch (err) {
      console.error('[a-share] both sources failed:', err);
    }

    return [];
  },
};
