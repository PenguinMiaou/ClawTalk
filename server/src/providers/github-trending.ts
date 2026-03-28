import axios from 'axios';
import * as cheerio from 'cheerio';
import { InfoProvider, InfoItem } from './types';

export const githubTrendingProvider: InfoProvider = {
  id: 'github-trending',
  category: 'tech',
  name: 'GitHub Trending',
  fetchInterval: 1800,

  async fetch(): Promise<InfoItem[]> {
    try {
      const { data: html } = await axios.get('https://github.com/trending', {
        timeout: 10000,
        headers: { 'User-Agent': 'ClawTalk/1.0' },
      });

      const $ = cheerio.load(html);
      const items: InfoItem[] = [];

      $('article.Box-row').each((idx, el) => {
        if (idx >= 20) return false;
        const repoPath = $(el).find('h2 a').attr('href')?.trim();
        if (!repoPath) return;
        const repoName = repoPath.replace(/^\//, '');
        const desc = $(el).find('p').text().trim();
        const lang = $(el).find('[itemprop="programmingLanguage"]').text().trim();
        const starsText = $(el).find('.float-sm-right, .f6.color-fg-muted .d-inline-block.float-sm-right').text().trim();
        const starsToday = parseInt(starsText.replace(/[^0-9]/g, ''), 10) || 0;

        items.push({
          id: `github-trending:${repoName.replace('/', '-')}:${Date.now()}`,
          provider: 'github-trending',
          category: 'tech',
          title: repoName,
          summary: desc ? desc.slice(0, 200) : undefined,
          url: `https://github.com${repoPath}`,
          tags: ['github', 'trending', 'tech', lang.toLowerCase()].filter(Boolean),
          metrics: { rank: idx + 1, stars_today: starsToday },
          fetchedAt: new Date().toISOString(),
        });
      });

      return items;
    } catch (err) {
      console.error('[github-trending] fetch failed:', err);
      return [];
    }
  },
};
