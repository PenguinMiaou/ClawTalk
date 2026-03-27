import { nanoid } from 'nanoid';
import { app } from '../src/app';
import { generateId, generateToken } from '../src/lib/id';
import { hashToken } from '../src/lib/hash';
import { prisma } from '../src/lib/prisma';
import supertest from 'supertest';
import { ShrimpFixture } from './fixtures/agents';

const request = supertest(app);

export { app, prisma, request };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegisteredAgent {
  id: string;
  name: string;
  handle: string;
  bio: string;
  apiKey: string;
  ownerToken: string;
}

// ---------------------------------------------------------------------------
// API-based registration helpers (go through HTTP, not direct DB)
// ---------------------------------------------------------------------------

/**
 * Register a single agent via POST /v1/agents/register.
 * Returns the agent info plus credentials.
 */
export async function registerViaAPI(
  fixture: ShrimpFixture,
): Promise<RegisteredAgent> {
  const res = await request
    .post('/v1/agents/register')
    .send({
      name: fixture.name,
      handle: fixture.handle,
      bio: fixture.bio,
      personality: fixture.personality,
    })
    .expect(201);

  return {
    id: res.body.agent.id,
    name: res.body.agent.name,
    handle: res.body.agent.handle,
    bio: res.body.agent.bio,
    apiKey: res.body.api_key,
    ownerToken: res.body.owner_token,
  };
}

/**
 * Register multiple agents in sequence (handles must be unique).
 */
export async function registerAgentsViaAPI(
  fixtures: ShrimpFixture[],
): Promise<RegisteredAgent[]> {
  const agents: RegisteredAgent[] = [];
  for (const f of fixtures) {
    agents.push(await registerViaAPI(f));
  }
  return agents;
}

// ---------------------------------------------------------------------------
// Authenticated request helpers
// ---------------------------------------------------------------------------

/** GET as an agent (X-API-Key header). */
export function agentGet(path: string, apiKey: string) {
  return request.get(path).set('X-API-Key', apiKey);
}

/** POST as an agent. */
export function agentPost(path: string, apiKey: string) {
  return request.post(path).set('X-API-Key', apiKey);
}

/** PUT as an agent. */
export function agentPut(path: string, apiKey: string) {
  return request.put(path).set('X-API-Key', apiKey);
}

/** DELETE as an agent. */
export function agentDel(path: string, apiKey: string) {
  return request.delete(path).set('X-API-Key', apiKey);
}

/** GET as an owner (Bearer token). */
export function ownerGet(path: string, ownerToken: string) {
  return request.get(path).set('Authorization', `Bearer ${ownerToken}`);
}

/** POST as an owner. */
export function ownerPost(path: string, ownerToken: string) {
  return request.post(path).set('Authorization', `Bearer ${ownerToken}`);
}

// ---------------------------------------------------------------------------
// Content creation helpers
// ---------------------------------------------------------------------------

/**
 * Create a post via the API (POST /v1/posts).
 * Returns the response body.
 */
export async function createPostViaAPI(
  apiKey: string,
  overrides: Partial<{ title: string; content: string; status: string }> = {},
) {
  const res = await agentPost('/v1/posts', apiKey)
    .send({
      title: overrides.title || `Test Post ${nanoid(6)}`,
      content: overrides.content || 'Integration test content',
      status: overrides.status || 'published',
    })
    .expect(201);
  return res.body;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Poll a condition until it returns true or timeout is reached.
 * Useful for waiting on async side effects (notifications, counts, etc.).
 */
export async function waitFor(
  fn: () => Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

export async function createTestAgent(overrides: Partial<{ name: string; handle: string; bio: string; trustLevel: number }> = {}) {
  const apiKey = generateToken('ct_agent');
  const ownerToken = generateToken('ct_owner');

  const agent = await prisma.agent.create({
    data: {
      id: generateId('shrimp'),
      name: overrides.name || 'Test Shrimp',
      handle: overrides.handle || `test_${nanoid(6)}`,
      bio: overrides.bio || 'A test shrimp',
      apiKeyHash: await hashToken(apiKey),
      apiKeyPrefix: apiKey.slice(apiKey.lastIndexOf('_') + 1, apiKey.lastIndexOf('_') + 13),
      ownerTokenHash: await hashToken(ownerToken),
      ownerTokenPrefix: ownerToken.slice(ownerToken.lastIndexOf('_') + 1, ownerToken.lastIndexOf('_') + 13),
      trustLevel: overrides.trustLevel ?? 0,
    },
  });

  return { agent, apiKey, ownerToken };
}

export async function createTestPost(agentId: string, overrides: Partial<{ title: string; content: string; status: 'published' | 'draft' | 'removed' | 'pending_approval' }> = {}) {
  return prisma.post.create({
    data: {
      id: generateId('post'),
      agentId,
      title: overrides.title || 'Test Post',
      content: overrides.content || 'Test content',
      status: overrides.status || 'published',
    },
  });
}

export async function cleanDb() {
  await prisma.circleReviewLog.deleteMany();
  await prisma.circleTopic.deleteMany();
  await prisma.agentCircle.deleteMany();
  await prisma.circle.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.like.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.agentTopic.deleteMany();
  await prisma.ownerMessage.deleteMany();
  await prisma.message.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postImage.deleteMany();
  await prisma.post.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.agent.deleteMany();
}
