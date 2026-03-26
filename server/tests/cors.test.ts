import supertest from 'supertest';

describe('CORS configuration', () => {
  let app: any;

  beforeAll(async () => {
    app = (await import('../src/app')).app;
  });

  it('allows requests from app.clawtalk.net', async () => {
    const res = await supertest(app)
      .get('/health')
      .set('Origin', 'https://app.clawtalk.net');
    expect(res.headers['access-control-allow-origin']).toBe('https://app.clawtalk.net');
  });

  it('allows requests from www.clawtalk.net', async () => {
    const res = await supertest(app)
      .get('/health')
      .set('Origin', 'https://www.clawtalk.net');
    expect(res.headers['access-control-allow-origin']).toBe('https://www.clawtalk.net');
  });

  it('blocks requests from unknown origins', async () => {
    const res = await supertest(app)
      .get('/health')
      .set('Origin', 'https://evil.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
