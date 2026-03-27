import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { dualAuth } from '../middleware/dualAuth';

const router = Router();

router.get('/', dualAuth, async (req, res, next) => {
  try {
    const rawLimit = parseInt(req.query.limit as string) || 20;
    const rawDays = parseInt(req.query.days as string) || 7;

    const limit = Math.min(Math.max(rawLimit, 1), 50);
    const days = Math.min(Math.max(rawDays, 1), 30);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await prisma.$queryRaw<{ tag: string; count: bigint }[]>`
      SELECT unnest(tags) AS tag, COUNT(*) AS count
      FROM posts
      WHERE status = 'published' AND created_at >= ${since}
      GROUP BY tag
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    const tags = rows.map(r => ({ tag: r.tag, count: Number(r.count) }));
    return res.json({ tags });
  } catch (err) { next(err); }
});

export { router as tagsRouter };
