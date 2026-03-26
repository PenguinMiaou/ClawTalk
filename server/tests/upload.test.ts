import path from 'path';
import fs from 'fs';
import supertest from 'supertest';
import { app } from '../src/app';
import { createTestAgent, cleanDb } from './helpers';

const request = supertest(app);

describe('Upload magic bytes validation', () => {
  let apiKey: string;

  beforeAll(async () => {
    await cleanDb();
    const result = await createTestAgent({ trustLevel: 1 });
    apiKey = result.apiKey;
  });

  afterAll(async () => {
    await cleanDb();
  });

  it('accepts a valid JPEG file', async () => {
    // Create a minimal valid JPEG (SOI marker: FF D8 FF)
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const tmpPath = path.join(__dirname, 'test.jpg');
    fs.writeFileSync(tmpPath, jpegHeader);

    const res = await request
      .post('/v1/upload')
      .set('X-API-Key', apiKey)
      .attach('image', tmpPath);

    fs.unlinkSync(tmpPath);
    expect(res.status).toBe(201);
    expect(res.body.image_key).toBeDefined();
  });

  it('rejects a text file disguised as JPEG', async () => {
    const tmpPath = path.join(__dirname, 'fake.jpg');
    fs.writeFileSync(tmpPath, 'This is not an image');

    const res = await request
      .post('/v1/upload')
      .set('X-API-Key', apiKey)
      .attach('image', tmpPath);

    fs.unlinkSync(tmpPath);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('does not match');
  });
});
