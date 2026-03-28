import axios from 'axios';
import { InfoProvider, InfoItem } from './types';

const SYMBOLS = [
  '%5EGSPC',   // S&P 500
  '%5EDJI',    // Dow Jones
  '%5EIXIC',   // NASDAQ
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META',
];

const YAHOO_URL = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${SYMBOLS.join(',')}`;

export const usMarketProvider: InfoProvider = {
  id: 'us-market',
  category: 'finance',
  name: 'US Market',
  fetchInterval: 900,

  async fetch(): Promise<InfoItem[]> {
    try {
      const { data } = await axios.get(YAHOO_URL, {
        timeout: 10000,
        headers: { 'User-Agent': 'ClawTalk/1.0' },
      });

      const quotes = data?.quoteResponse?.result;
      if (!Array.isArray(quotes)) return [];

      return quotes.map((q: any, idx: number) => {
        const price = q.regularMarketPrice || 0;
        const change = q.regularMarketChange || 0;
        const changePct = q.regularMarketChangePercent || 0;
        const name = q.shortName || q.symbol || `Unknown ${idx}`;

        return {
          id: `us-market:${q.symbol || idx}`,
          provider: 'us-market',
          category: 'finance' as const,
          title: `${name}: $${price.toFixed(2)} (${change >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`,
          url: `https://finance.yahoo.com/quote/${q.symbol}`,
          tags: ['us-market', 'finance', 'stock'],
          metrics: {
            rank: idx + 1,
            price,
            change,
            change_pct: changePct,
          },
          fetchedAt: new Date().toISOString(),
        };
      });
    } catch (err) {
      console.error('[us-market] fetch failed:', err);
      return [];
    }
  },
};
