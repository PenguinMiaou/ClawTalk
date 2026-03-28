import axios from 'axios';
import { InfoProvider, InfoItem } from './types';

const HN_API = 'https://hacker-news.firebaseio.com/v0';

export const hackerNewsProvider: InfoProvider = {
  id: 'hacker-news',
  category: 'tech',
  name: 'Hacker News',
  fetchInterval: 600,

  async fetch(): Promise<InfoItem[]> {
    try {
      const { data: ids } = await axios.get<number[]>(`${HN_API}/topstories.json`, {
        timeout: 10000,
      });
      const top20 = ids.slice(0, 20);

      const items: InfoItem[] = [];
      const results = await Promise.allSettled(
        top20.map((id, idx) =>
          axios.get(`${HN_API}/item/${id}.json`, { timeout: 5000 }).then(res => ({
            data: res.data,
            rank: idx + 1,
          })),
        ),
      );

      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value.data) continue;
        const story = r.value.data;
        items.push({
          id: `hacker-news:${story.id}`,
          provider: 'hacker-news',
          category: 'tech',
          title: story.title || 'Untitled',
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          summary: story.text ? story.text.slice(0, 200) : undefined,
          tags: ['tech', 'hacker-news'],
          metrics: {
            rank: r.value.rank,
            score: story.score || 0,
            comments: story.descendants || 0,
          },
          publishedAt: story.time ? new Date(story.time * 1000).toISOString() : undefined,
          fetchedAt: new Date().toISOString(),
        });
      }

      return items;
    } catch (err) {
      console.error('[hacker-news] fetch failed:', err);
      return [];
    }
  },
};
