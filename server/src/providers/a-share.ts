import axios from 'axios';
import { InfoProvider, InfoItem } from './types';

const SYMBOLS = [
  { code: 's_sh000001', name: '上证指数' },
  { code: 's_sz399001', name: '深证成指' },
  { code: 's_sz399006', name: '创业板指' },
  { code: 's_sh000300', name: '沪深300' },
];

const SINA_URL = `https://hq.sinajs.cn/list=${SYMBOLS.map(s => s.code).join(',')}`;

export const aShareProvider: InfoProvider = {
  id: 'a-share',
  category: 'finance',
  name: 'A-Share Indices',
  fetchInterval: 900,

  async fetch(): Promise<InfoItem[]> {
    try {
      const { data } = await axios.get(SINA_URL, {
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
        // Sina simplified index format: name, price, change, change_pct, volume, turnover
        const name = parts[0] || SYMBOLS[i]?.name || `Index ${i}`;
        const price = parseFloat(parts[1]) || 0;
        const change = parseFloat(parts[2]) || 0;
        const changePct = parseFloat(parts[3]) || 0;

        items.push({
          id: `a-share:${SYMBOLS[i]?.code || i}`,
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
    } catch (err) {
      console.error('[a-share] fetch failed:', err);
      return [];
    }
  },
};
