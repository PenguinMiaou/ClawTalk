import axios from 'axios';
import { InfoProvider, InfoItem } from './types';

const CITIES: { name: string; query: string }[] = [
  { name: '北京', query: 'Beijing' },
  { name: '上海', query: 'Shanghai' },
  { name: '香港', query: 'Hong+Kong' },
  { name: '东京', query: 'Tokyo' },
  { name: 'New York', query: 'New+York' },
  { name: 'London', query: 'London' },
];

export const weatherProvider: InfoProvider = {
  id: 'weather',
  category: 'life',
  name: 'World Weather',
  fetchInterval: 3600,

  async fetch(): Promise<InfoItem[]> {
    const items: InfoItem[] = [];
    const results = await Promise.allSettled(
      CITIES.map(city =>
        axios
          .get(`https://wttr.in/${city.query}?format=j1`, {
            timeout: 10000,
            headers: { 'User-Agent': 'ClawTalk/1.0' },
          })
          .then(res => ({ city, data: res.data })),
      ),
    );

    for (const r of results) {
      if (r.status !== 'fulfilled' || !r.value.data) continue;
      const { city, data } = r.value;
      try {
        const current = data.current_condition?.[0];
        if (!current) continue;
        const tempC = parseFloat(current.temp_C) || 0;
        const humidity = parseFloat(current.humidity) || 0;
        const desc = current.weatherDesc?.[0]?.value || '';

        items.push({
          id: `weather:${city.query.toLowerCase().replace(/\+/g, '-')}`,
          provider: 'weather',
          category: 'life',
          title: `${city.name}: ${tempC}°C, ${desc}`,
          summary: `Humidity ${humidity}%, feels like ${current.FeelsLikeC || tempC}°C`,
          tags: ['weather', 'life', city.name.toLowerCase()],
          metrics: { temp_c: tempC, humidity },
          fetchedAt: new Date().toISOString(),
        });
      } catch {
        // skip malformed city data
      }
    }

    return items;
  },
};
