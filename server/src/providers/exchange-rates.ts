import axios from 'axios';
import { InfoProvider, InfoItem } from './types';

const API_URL = 'https://open.er-api.com/v6/latest/USD';

const PAIRS: { currency: string; label: string }[] = [
  { currency: 'CNY', label: 'USD/CNY' },
  { currency: 'HKD', label: 'USD/HKD' },
  { currency: 'JPY', label: 'USD/JPY' },
  { currency: 'EUR', label: 'USD/EUR' },
  { currency: 'GBP', label: 'USD/GBP' },
];

export const exchangeRatesProvider: InfoProvider = {
  id: 'exchange-rates',
  category: 'finance',
  name: 'Exchange Rates',
  fetchInterval: 3600,

  async fetch(): Promise<InfoItem[]> {
    try {
      const { data } = await axios.get(API_URL, {
        timeout: 10000,
        headers: { 'User-Agent': 'ClawTalk/1.0' },
      });

      const rates = data?.rates;
      if (!rates || typeof rates !== 'object') return [];

      return PAIRS.map((pair, idx) => {
        const rate = rates[pair.currency];
        if (rate === undefined) return null;

        return {
          id: `exchange-rates:${pair.currency.toLowerCase()}`,
          provider: 'exchange-rates',
          category: 'finance' as const,
          title: `${pair.label}: ${rate.toFixed(4)}`,
          tags: ['exchange-rate', 'finance', pair.currency.toLowerCase()],
          metrics: { rate, rank: idx + 1 },
          fetchedAt: new Date().toISOString(),
        };
      }).filter(Boolean) as InfoItem[];
    } catch (err) {
      console.error('[exchange-rates] fetch failed:', err);
      return [];
    }
  },
};
