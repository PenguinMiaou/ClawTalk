import axios from 'axios';
import * as cheerio from 'cheerio';
import { InfoProvider, InfoItem } from './types';

const SYMBOLS = [
  { symbol: '.INX:INDEXSP', name: 'S&P 500', yahoo: '%5EGSPC' },
  { symbol: '.DJI:INDEXDJX', name: 'Dow Jones', yahoo: '%5EDJI' },
  { symbol: '.IXIC:INDEXNASDAQ', name: 'NASDAQ', yahoo: '%5EIXIC' },
  { symbol: 'AAPL:NASDAQ', name: 'Apple', yahoo: 'AAPL' },
  { symbol: 'MSFT:NASDAQ', name: 'Microsoft', yahoo: 'MSFT' },
  { symbol: 'GOOGL:NASDAQ', name: 'Alphabet', yahoo: 'GOOGL' },
  { symbol: 'AMZN:NASDAQ', name: 'Amazon', yahoo: 'AMZN' },
  { symbol: 'NVDA:NASDAQ', name: 'NVIDIA', yahoo: 'NVDA' },
  { symbol: 'TSLA:NASDAQ', name: 'Tesla', yahoo: 'TSLA' },
  { symbol: 'META:NASDAQ', name: 'Meta', yahoo: 'META' },
];

async function fetchFromGoogleFinance(): Promise<InfoItem[]> {
  const items: InfoItem[] = [];

  for (let i = 0; i < SYMBOLS.length; i++) {
    const s = SYMBOLS[i];
    try {
      const url = `https://www.google.com/finance/quote/${s.symbol}`;
      const { data: html } = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const $ = cheerio.load(html);

      // Google Finance puts the current price in a div with data-last-price attribute
      const priceEl = $('[data-last-price]').first();
      const price = parseFloat(priceEl.attr('data-last-price') || '0');

      // Change info from data-change and data-change-percent attributes
      const change = parseFloat($('[data-change]').first().attr('data-change') || '0');
      const changePct = parseFloat(
        $('[data-change-percent]').first().attr('data-change-percent') || '0',
      );

      if (price > 0) {
        items.push({
          id: `us-market:${s.yahoo}`,
          provider: 'us-market',
          category: 'finance',
          title: `${s.name}: $${price.toFixed(2)} (${change >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`,
          url: `https://finance.yahoo.com/quote/${s.yahoo}`,
          tags: ['us-market', 'finance', 'stock'],
          metrics: {
            rank: i + 1,
            price,
            change,
            change_pct: changePct,
          },
          fetchedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Skip individual symbol failures
    }
  }

  return items;
}

async function fetchFromYahooV8(): Promise<InfoItem[]> {
  const symbols = SYMBOLS.map((s) => s.yahoo).join(',');
  const url = `https://query2.finance.yahoo.com/v8/finance/spark?symbols=${symbols}&range=1d&interval=1d`;

  const { data } = await axios.get(url, {
    timeout: 10000,
    headers: { 'User-Agent': 'ClawTalk/1.0' },
  });

  const results = data?.spark?.result;
  if (!Array.isArray(results)) throw new Error('unexpected v8 structure');

  return results
    .map((r: any, idx: number) => {
      const meta = r?.response?.[0]?.meta;
      if (!meta) return null;
      const price = meta.regularMarketPrice || 0;
      const prevClose = meta.previousClose || meta.chartPreviousClose || price;
      const change = price - prevClose;
      const changePct = prevClose ? (change / prevClose) * 100 : 0;
      const sym = SYMBOLS.find((s) => s.yahoo === meta.symbol) || SYMBOLS[idx];

      return {
        id: `us-market:${meta.symbol || idx}`,
        provider: 'us-market',
        category: 'finance' as const,
        title: `${sym?.name || meta.symbol}: $${price.toFixed(2)} (${change >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`,
        url: `https://finance.yahoo.com/quote/${meta.symbol}`,
        tags: ['us-market', 'finance', 'stock'],
        metrics: {
          rank: idx + 1,
          price,
          change,
          change_pct: changePct,
        },
        fetchedAt: new Date().toISOString(),
      };
    })
    .filter(Boolean) as InfoItem[];
}

export const usMarketProvider: InfoProvider = {
  id: 'us-market',
  category: 'finance',
  name: 'US Market',
  fetchInterval: 900,

  async fetch(): Promise<InfoItem[]> {
    // Try Yahoo v8 spark API first
    try {
      const items = await fetchFromYahooV8();
      if (items.length > 0) return items;
    } catch (err) {
      console.warn('[us-market] Yahoo v8 failed, trying Google Finance:', err);
    }

    // Fallback: scrape Google Finance
    try {
      const items = await fetchFromGoogleFinance();
      if (items.length > 0) return items;
    } catch (err) {
      console.error('[us-market] Google Finance also failed:', err);
    }

    return [];
  },
};
