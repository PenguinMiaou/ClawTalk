import * as cron from 'node-cron';
import * as fs from 'fs';
import axios from 'axios';
import { getRedis } from '../config/redis';
import { PRESETS, DATA_FILE } from '../routes/stockImages';

const UNSPLASH_BASE = 'https://api.unsplash.com/photos/random';
const IMAGES_PER_TOPIC = 6;
const REDIS_TTL = 86400; // 24 hours

async function fetchTopicFromUnsplash(topic: string, accessKey: string): Promise<string[]> {
  try {
    const resp = await axios.get(UNSPLASH_BASE, {
      params: { query: topic, count: IMAGES_PER_TOPIC, orientation: 'squarish' },
      headers: { Authorization: `Client-ID ${accessKey}` },
      timeout: 10000,
    });
    return resp.data.map((p: any) => p.urls.regular);
  } catch {
    return [];
  }
}

async function refreshAllTopics(): Promise<void> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.log('[stock-images] No UNSPLASH_ACCESS_KEY, skipping refresh');
    return;
  }

  const topics = Object.keys(PRESETS).filter(k => k !== 'default');
  const redis = getRedis();
  const fileData: Record<string, string[]> = {};

  // Load existing file data
  try {
    if (fs.existsSync(DATA_FILE)) {
      Object.assign(fileData, JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')));
    }
  } catch { /* start fresh */ }

  let fetched = 0;
  let failed = 0;

  for (const topic of topics) {
    const urls = await fetchTopicFromUnsplash(topic, accessKey);
    if (urls.length > 0) {
      fileData[topic] = urls;
      if (redis) {
        try { await redis.set(`stock:${topic}`, JSON.stringify(urls), 'EX', REDIS_TTL); } catch {}
      }
      fetched++;
    } else {
      failed++;
    }

    // Rate limit: wait 1.5s between requests to stay under Unsplash 50/hour
    await new Promise(r => setTimeout(r, 1500));
  }

  // Write to local file (persistent storage)
  try {
    const dir = require('path').dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(fileData, null, 2));
  } catch (err) {
    console.error('[stock-images] Failed to write data file:', err);
  }

  console.log(`[stock-images] Refresh done: ${fetched} topics updated, ${failed} failed, ${topics.length} total`);
}

export function startStockImageCron(): void {
  // Run every 6 hours: 0 */6 * * *
  cron.schedule('0 */6 * * *', () => {
    console.log('[stock-images] Starting scheduled refresh...');
    refreshAllTopics().catch(err => console.error('[stock-images] Cron error:', err));
  });

  // Also run once on startup (after 30s delay to let server boot)
  setTimeout(() => {
    console.log('[stock-images] Initial refresh on startup...');
    refreshAllTopics().catch(err => console.error('[stock-images] Startup refresh error:', err));
  }, 30000);
}
