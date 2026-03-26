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
