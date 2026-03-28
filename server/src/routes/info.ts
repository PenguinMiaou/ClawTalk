import { Router } from 'express';
import { dualAuth } from '../middleware/dualAuth';
import { validateQuery } from '../lib/validate';
import { infoQuerySchema, infoSearchSchema } from '../lib/schemas';
import { prisma } from '../lib/prisma';
import {
  getAllCachedItems,
  getProvidersMeta,
  incrementConsumed,
  getConsumedCount,
} from '../providers';
import { InfoItem } from '../providers/types';
import { liveSearch, checkLiveSearchQuota, incrementLiveSearchCount } from '../providers/live-search';
import { TooManyRequests } from '../lib/errors';

const router = Router();

// GET /v1/info — browse cached info
router.get('/', dualAuth, validateQuery(infoQuerySchema), async (req, res, next) => {
  try {
    const { category, circles, limit } = (req as any).validatedQuery;

    let categories: string[] | undefined;
    if (circles) {
      const circleIds = (circles as string).split(',').map((s: string) => s.trim());
      const circleRecords = await prisma.circle.findMany({
        where: { id: { in: circleIds }, isActive: true },
        select: { tags: true },
      });
      const infoTags = circleRecords
        .flatMap((c: { tags: string[] }) => c.tags)
        .filter((t: string) => t.startsWith('info:'))
        .map((t: string) => t.slice(5));
      categories = [...new Set<string>(infoTags)];
      if (categories.length === 0) categories = undefined;
    } else if (category) {
      categories = [category];
    }

    let items = await getAllCachedItems(categories);

    // Heat decay sort
    const scored: Array<{ item: InfoItem; score: number }> = [];
    for (const item of items) {
      const consumed = await getConsumedCount(item.id);
      const baseScore = item.metrics?.rank
        ? 1000 - (item.metrics.rank || 0)
        : item.metrics?.heat || 100;
      scored.push({ item, score: baseScore / (consumed + 1) });
    }
    scored.sort((a, b) => b.score - a.score);

    const limited = scored.slice(0, limit);

    // Increment consumed counts (fire and forget)
    for (const s of limited) {
      incrementConsumed(s.item.id, 3600);
    }

    const updatedAt = items.length > 0
      ? items.reduce((max, i) => i.fetchedAt > max ? i.fetchedAt : max, items[0].fetchedAt)
      : new Date().toISOString();

    res.json({
      items: limited.map(s => s.item),
      updatedAt,
    });
  } catch (err) { next(err); }
});

// GET /v1/info/providers
router.get('/providers', dualAuth, async (_req, res, next) => {
  try {
    const providers = await getProvidersMeta();
    res.json({ providers });
  } catch (err) { next(err); }
});

// GET /v1/info/search
router.get('/search', dualAuth, validateQuery(infoSearchSchema), async (req, res, next) => {
  try {
    const { q, category, live } = (req as any).validatedQuery;
    const isOwner = (req as any).isOwner;

    const categories = category ? [category] : undefined;
    const allItems = await getAllCachedItems(categories);
    const qLower = q.toLowerCase();
    let results = allItems.filter(item =>
      item.title.toLowerCase().includes(qLower) ||
      item.tags.some(t => t.toLowerCase().includes(qLower)) ||
      (item.summary && item.summary.toLowerCase().includes(qLower))
    );

    if (live && isOwner) {
      const agent = (req as any).agent;
      const quota = await checkLiveSearchQuota(agent.id);
      if (!quota.allowed) {
        return next(new TooManyRequests(0));
      }

      const liveResults = await liveSearch(q);
      await incrementLiveSearchCount(agent.id);

      const seenTitles = new Set(results.map(r => r.title.toLowerCase().slice(0, 30)));
      for (const item of liveResults) {
        if (!seenTitles.has(item.title.toLowerCase().slice(0, 30))) {
          results.push(item);
        }
      }
    }

    results = results.slice(0, 20);

    res.json({
      items: results,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

export { router as infoRouter };
