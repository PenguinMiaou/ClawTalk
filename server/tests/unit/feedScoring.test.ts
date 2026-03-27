import {
  computeDiscoverScore,
  computeTrendingScore,
  encodeCursor,
  decodeCursor,
} from '../../src/lib/feedScoring';

const now = new Date('2026-01-01T12:00:00Z');

function makePost(likesCount: number, commentsCount: number, ageHours: number) {
  const createdAt = new Date(now.getTime() - ageHours * 60 * 60 * 1000);
  return { likesCount, commentsCount, createdAt };
}

describe('computeDiscoverScore', () => {
  it('fresh popular post scores higher than old popular post', () => {
    const fresh = makePost(100, 20, 1);    // 1 hour old
    const old = makePost(100, 20, 48);     // 48 hours old
    const freshScore = computeDiscoverScore(fresh, now);
    const oldScore = computeDiscoverScore(old, now);
    expect(freshScore).toBeGreaterThan(oldScore);
  });

  it('applies freshness bonus for posts under 2 hours old', () => {
    const under2h = makePost(0, 0, 1);     // eligible for +5 bonus
    const over2h = makePost(0, 0, 3);      // eligible for +2 bonus (< 6h window)
    const scoreUnder2h = computeDiscoverScore(under2h, now);
    const scoreOver2h = computeDiscoverScore(over2h, now);
    expect(scoreUnder2h).toBeGreaterThan(scoreOver2h);
  });

  it('uses log scale — 100 likes is NOT 10x score of 10 likes (controlling for time)', () => {
    const post10 = makePost(10, 0, 24);
    const post100 = makePost(100, 0, 24);
    const score10 = computeDiscoverScore(post10, now);
    const score100 = computeDiscoverScore(post100, now);
    // log10(101) ≈ 2.0, log10(11) ≈ 1.04 → ratio ≈ 1.9x, definitely not 10x
    expect(score100 / score10).toBeLessThan(5);
    expect(score100).toBeGreaterThan(score10);
  });

  it('weights comments 2x over likes (10 likes ≈ 5 comments in score)', () => {
    const postWith10Likes = makePost(10, 0, 24);
    const postWith5Comments = makePost(0, 5, 24);
    // both have engagement = 10 (10 likes vs 5 comments × 2)
    const score10Likes = computeDiscoverScore(postWith10Likes, now);
    const score5Comments = computeDiscoverScore(postWith5Comments, now);
    expect(score10Likes).toBeCloseTo(score5Comments, 10);
  });
});

describe('computeTrendingScore', () => {
  it('ranks by engagement velocity — more engagement per time unit wins', () => {
    const fastGrowing = makePost(100, 10, 2);   // 120 engagement / 3 hours
    const slowGrowing = makePost(100, 10, 48);  // 120 engagement / 49 hours
    const scoreFast = computeTrendingScore(fastGrowing, now);
    const scoreSlow = computeTrendingScore(slowGrowing, now);
    expect(scoreFast).toBeGreaterThan(scoreSlow);
  });

  it('uses linear engagement, not log scale', () => {
    const post10 = makePost(10, 0, 5);
    const post20 = makePost(20, 0, 5);
    const score10 = computeTrendingScore(post10, now);
    const score20 = computeTrendingScore(post20, now);
    // linear: score20 should be exactly 2x score10
    expect(score20 / score10).toBeCloseTo(2, 5);
  });
});

describe('encodeCursor / decodeCursor', () => {
  it('round-trips a score+id cursor', () => {
    const data = { score: 3.14159, id: 'post_abc123' };
    const cursor = encodeCursor(data);
    expect(typeof cursor).toBe('string');
    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual(data);
  });

  it('round-trips a time+id cursor', () => {
    const data = { time: '2026-01-01T12:00:00.000Z', id: 'post_xyz789' };
    const cursor = encodeCursor(data);
    expect(typeof cursor).toBe('string');
    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual(data);
  });

  it('returns null for invalid cursor input', () => {
    expect(decodeCursor('not-valid-base64!!!!')).toBeNull();
    expect(decodeCursor('')).toBeNull();
    expect(decodeCursor('aGVsbG8=')).toBeNull(); // valid base64 but not a cursor object
  });
});
