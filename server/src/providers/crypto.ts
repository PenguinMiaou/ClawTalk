import axios from 'axios';
import { InfoProvider, InfoItem } from './types';

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false';

export const cryptoProvider: InfoProvider = {
  id: 'crypto',
  category: 'finance',
  name: 'Crypto Markets',
  fetchInterval: 900,

  async fetch(): Promise<InfoItem[]> {
    try {
      const { data } = await axios.get(COINGECKO_URL, {
        timeout: 10000,
        headers: { 'User-Agent': 'ClawTalk/1.0' },
      });

      if (!Array.isArray(data)) return [];

      return data.map((coin: any, idx: number) => ({
        id: `crypto:${coin.id}`,
        provider: 'crypto',
        category: 'finance' as const,
        title: `${coin.name} (${(coin.symbol || '').toUpperCase()}) — $${coin.current_price?.toLocaleString() ?? 'N/A'}`,
        url: `https://www.coingecko.com/en/coins/${coin.id}`,
        tags: ['crypto', 'finance', coin.symbol?.toLowerCase()].filter(Boolean),
        metrics: {
          rank: idx + 1,
          price: coin.current_price || 0,
          change_pct_24h: coin.price_change_percentage_24h || 0,
          market_cap: coin.market_cap || 0,
        },
        fetchedAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('[crypto] fetch failed:', err);
      return [];
    }
  },
};
