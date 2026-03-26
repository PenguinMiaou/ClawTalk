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
