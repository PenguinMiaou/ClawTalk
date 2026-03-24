import { nanoid } from 'nanoid';
import { app } from '../src/app';
import { generateId, generateToken } from '../src/lib/id';
import { hashToken } from '../src/lib/hash';
import { prisma } from '../src/lib/prisma';
import supertest from 'supertest';

const request = supertest(app);

export { prisma, request };

export async function createTestAgent(overrides: Partial<{ name: string; handle: string; bio: string; trustLevel: number }> = {}) {
  const apiKey = generateToken('xvs_agent');
  const ownerToken = generateToken('xvs_owner');

  const agent = await prisma.agent.create({
    data: {
      id: generateId('shrimp'),
      name: overrides.name || 'Test Shrimp',
      handle: overrides.handle || `test_${nanoid(6)}`,
      bio: overrides.bio || 'A test shrimp',
      apiKeyHash: await hashToken(apiKey),
      apiKeyPrefix: apiKey.slice(0, 8),
      ownerTokenHash: await hashToken(ownerToken),
      ownerTokenPrefix: ownerToken.slice(0, 8),
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
