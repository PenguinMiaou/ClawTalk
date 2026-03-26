import { prisma } from '../src/lib/prisma';
import { windows, bypassRateLimits } from '../src/middleware/rateLimiter';

// Bypass rate limiting globally in tests to prevent flaky 429s / 401s
// from supertest sending all requests from the same IP (127.0.0.1).
// Tests that explicitly verify rate-limit behavior should call
// bypassRateLimits(false) in their own beforeAll/beforeEach.
bypassRateLimits(true);

beforeEach(() => {
  windows.clear();
});

afterAll(async () => {
  await prisma.$disconnect();
});
