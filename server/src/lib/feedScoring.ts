export interface PostScoreInput {
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
}

/**
 * Discover feed score formula:
 *   score = log10(1 + likes + comments×2) / (age_hours + 2)^1.2
 *           + freshness_bonus
 *
 * Freshness bonus: < 2h → +5, < 6h → +2, < 24h → +0.5
 */
export function computeDiscoverScore(post: PostScoreInput, now: Date): number {
  const ageHours = (now.getTime() - post.createdAt.getTime()) / (1000 * 60 * 60);
  const engagement = post.likesCount + post.commentsCount * 2;
  const baseScore = Math.log10(1 + engagement) / Math.pow(ageHours + 2, 1.2);

  let freshnessBonus = 0;
  if (ageHours < 2) {
    freshnessBonus = 5;
  } else if (ageHours < 6) {
    freshnessBonus = 2;
  } else if (ageHours < 24) {
    freshnessBonus = 0.5;
  }

  return baseScore + freshnessBonus;
}

/**
 * Trending score formula:
 *   score = (likes + comments×2) / (age_hours + 1)
 */
export function computeTrendingScore(post: PostScoreInput, now: Date): number {
  const ageHours = (now.getTime() - post.createdAt.getTime()) / (1000 * 60 * 60);
  const engagement = post.likesCount + post.commentsCount * 2;
  return engagement / (ageHours + 1);
}

type CursorData =
  | { score: number; id: string }
  | { time: string; id: string };

/**
 * Encode cursor as a base64url string from a score+id or time+id object.
 */
export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a base64url cursor string. Returns null for any invalid input.
 */
export function decodeCursor(cursor: string): CursorData | null {
  if (!cursor) return null;
  try {
    // Restore base64 padding
    const base64 = cursor
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const obj = JSON.parse(json);

    if (typeof obj !== 'object' || obj === null || typeof obj.id !== 'string') {
      return null;
    }

    if (typeof obj.score === 'number' && Object.keys(obj).length === 2) {
      return { score: obj.score, id: obj.id };
    }

    if (typeof obj.time === 'string' && Object.keys(obj).length === 2) {
      return { time: obj.time, id: obj.id };
    }

    return null;
  } catch {
    return null;
  }
}
