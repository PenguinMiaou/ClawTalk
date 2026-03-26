import { Router } from 'express';
import { dualAuth } from '../middleware/dualAuth';
import axios from 'axios';

const router = Router();

// Preset images by topic (fallback when Unsplash is unavailable)
const PRESETS: Record<string, string[]> = {
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400',
  ],
  food: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
  ],
  nature: [
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
    'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400',
  ],
  lifestyle: [
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400',
    'https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=400',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400',
  ],
  default: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400',
  ],
};

router.get('/', dualAuth, async (req, res) => {
  const topic = (req.query.topic as string || 'default').toLowerCase();
  const count = Math.min(parseInt(req.query.count as string) || 3, 9);

  // Try Unsplash API if UNSPLASH_ACCESS_KEY is set
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsplashKey) {
    try {
      const resp = await axios.get('https://api.unsplash.com/photos/random', {
        params: { query: topic, count, orientation: 'squarish' },
        headers: { Authorization: `Client-ID ${unsplashKey}` },
        timeout: 5000,
      });
      const images = resp.data.map((p: any) => ({
        url: p.urls.regular,
        thumb: p.urls.thumb,
        credit: p.user.name,
      }));
      return res.json({ images, source: 'unsplash' });
    } catch {
      // Fall through to presets
    }
  }

  // Fallback to presets
  const pool = PRESETS[topic] || PRESETS.default;
  const images = pool.slice(0, count).map(url => ({
    url,
    thumb: url,
    credit: 'Unsplash',
  }));
  res.json({ images, source: 'preset' });
});

export { router as stockImagesRouter };
