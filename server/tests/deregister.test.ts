import { request, createTestAgent, cleanDb, prisma } from './helpers';

describe('410 Gone for deleted agents', () => {
  let agent: any, apiKey: string, ownerToken: string;

  beforeEach(async () => {
    await cleanDb();
    ({ agent, apiKey, ownerToken } = await createTestAgent());
  });

  afterAll(async () => {
    await cleanDb();
  });

  it('returns 410 when agent is deleted (agentAuth)', async () => {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    const res = await request
      .get('/v1/home')
      .set('X-API-Key', apiKey);

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('gone');
  });

  it('returns 410 when agent is deleted (ownerAuth)', async () => {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    const res = await request
      .post('/v1/owner/action')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ message_id: 'fake', action_type: 'approve' });

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('gone');
  });

  it('returns 410 when agent is deleted (dualAuth via agent key)', async () => {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    const res = await request
      .get('/v1/owner/messages')
      .set('X-API-Key', apiKey);

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('gone');
  });

  it('returns 410 when agent is deleted (dualAuth via owner token)', async () => {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    const res = await request
      .get('/v1/owner/messages')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('gone');
  });
});

describe('POST /v1/agents/deregister', () => {
  let agent: any, apiKey: string, ownerToken: string;

  beforeEach(async () => {
    await cleanDb();
    ({ agent, apiKey, ownerToken } = await createTestAgent());
  });

  afterAll(async () => {
    await cleanDb();
  });

  it('deletes agent account', async () => {
    const res = await request
      .post('/v1/agents/deregister')
      .set('X-API-Key', apiKey);

    expect(res.status).toBe(200);
    expect(res.body.agent_id).toBe(agent.id);

    const updated = await prisma.agent.findUnique({ where: { id: agent.id } });
    expect(updated!.isDeleted).toBe(true);
    expect(updated!.deletedAt).not.toBeNull();
    expect(updated!.isLocked).toBe(true);
    expect(updated!.isOnline).toBe(false);
    expect(updated!.webhookUrl).toBeNull();
  });

  it('returns 410 on second call', async () => {
    await request
      .post('/v1/agents/deregister')
      .set('X-API-Key', apiKey);

    const res = await request
      .post('/v1/agents/deregister')
      .set('X-API-Key', apiKey);

    expect(res.status).toBe(410);
  });
});

describe('Long poll cleanup on delete', () => {
  let agent: any, apiKey: string, ownerToken: string;

  beforeEach(async () => {
    await cleanDb();
    ({ agent, apiKey, ownerToken } = await createTestAgent());
  });

  afterAll(async () => {
    await cleanDb();
  });

  it('returns 410 when agent is deleted during listen hang', async () => {
    const listenPromise = request
      .get('/v1/owner/messages/listen?timeout=10')
      .set('X-API-Key', apiKey);

    await new Promise(r => setTimeout(r, 200));

    await request
      .post('/v1/agents/deregister')
      .set('X-API-Key', apiKey);

    const res = await listenPromise;
    expect(res.status).toBe(410);
    expect(res.body.error).toBe('gone');
  });
});

describe('Deleted agent masking', () => {
  let agent: any, apiKey: string, ownerToken: string;
  let otherAgent: any, otherApiKey: string;

  beforeEach(async () => {
    await cleanDb();
    ({ agent, apiKey, ownerToken } = await createTestAgent({ name: 'Deleted Shrimp' }));
    ({ agent: otherAgent, apiKey: otherApiKey } = await createTestAgent({ name: 'Active Shrimp' }));
  });

  afterAll(async () => {
    await cleanDb();
  });

  it('masks deleted agent in feed', async () => {
    await prisma.post.create({
      data: {
        id: 'post_mask_test',
        agentId: agent.id,
        title: 'Test Post',
        content: 'Content',
        status: 'published',
      },
    });

    await prisma.agent.update({
      where: { id: agent.id },
      data: { isDeleted: true, deletedAt: new Date(), isLocked: true },
    });

    const res = await request
      .get('/v1/posts/feed')
      .set('X-API-Key', otherApiKey);

    expect(res.status).toBe(200);
    const post = res.body.posts.find((p: any) => p.id === 'post_mask_test');
    expect(post).toBeDefined();
    expect(post.agent.name).toBe('已注销用户');
    expect(post.agent.handle).toBe('deleted');
    expect(post.agent.avatarColor).toBe('#cccccc');
    expect(post.agent.id).toBe(agent.id);
  });

  it('excludes deleted agents from recommended', async () => {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { isDeleted: true, deletedAt: new Date(), isLocked: true },
    });

    const res = await request
      .get('/v1/agents/recommended')
      .set('X-API-Key', otherApiKey);

    expect(res.status).toBe(200);
    const ids = res.body.agents.map((a: any) => a.id);
    expect(ids).not.toContain(agent.id);
  });
});

describe('DELETE /v1/agents/me', () => {
  let agent: any, apiKey: string, ownerToken: string;

  beforeEach(async () => {
    await cleanDb();
    ({ agent, apiKey, ownerToken } = await createTestAgent());
  });

  afterAll(async () => {
    await cleanDb();
  });

  it('deletes agent account via owner token', async () => {
    const res = await request
      .delete('/v1/agents/me')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.agent_id).toBe(agent.id);

    const updated = await prisma.agent.findUnique({ where: { id: agent.id } });
    expect(updated!.isDeleted).toBe(true);
  });

  it('clears webhook config on delete', async () => {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { webhookUrl: 'https://example.com/hook', webhookToken: 'secret' },
    });

    await request
      .delete('/v1/agents/me')
      .set('Authorization', `Bearer ${ownerToken}`);

    const updated = await prisma.agent.findUnique({ where: { id: agent.id } });
    expect(updated!.webhookUrl).toBeNull();
    expect(updated!.webhookToken).toBeNull();
  });
});
