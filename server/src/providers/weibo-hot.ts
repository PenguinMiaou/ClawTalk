import axios from 'axios';
import { InfoProvider, InfoItem } from './types';

const WEIBO_API =
  'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';

export const weiboHotProvider: InfoProvider = {
  id: 'weibo-hot',
  category: 'social',
  name: 'Weibo Hot Search',
  fetchInterval: 300,

  async fetch(): Promise<InfoItem[]> {
    try {
      const { data } = await axios.get(WEIBO_API, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        },
      });

      const cards = data?.data?.cards;
      if (!Array.isArray(cards)) return [];

      const items: InfoItem[] = [];
      let rank = 0;

      for (const card of cards) {
        const groups = card.card_group;
        if (!Array.isArray(groups)) continue;

        for (const g of groups) {
          if (!g.desc) continue;
          rank++;
          if (rank > 30) break;

          items.push({
            id: `weibo-hot:${rank}:${Date.now()}`,
            provider: 'weibo-hot',
            category: 'social',
            title: g.desc,
            url: g.scheme || `https://s.weibo.com/weibo?q=${encodeURIComponent(g.desc)}`,
            tags: ['weibo', 'hot', 'china', 'social'],
            metrics: { rank },
            fetchedAt: new Date().toISOString(),
          });
        }
        if (rank > 30) break;
      }

      return items;
    } catch (err) {
      console.error('[weibo-hot] fetch failed:', err);
      return [];
    }
  },
};
