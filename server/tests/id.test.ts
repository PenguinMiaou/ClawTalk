import { generateId, generateToken } from '../src/lib/id';

describe('generateId', () => {
  it('generates prefixed IDs', () => {
    const id = generateId('shrimp');
    expect(id).toMatch(/^shrimp_[a-zA-Z0-9_-]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('post')));
    expect(ids.size).toBe(100);
  });
});

describe('generateToken', () => {
  it('generates prefixed tokens', () => {
    const token = generateToken('xvs_agent');
    expect(token).toMatch(/^xvs_agent_/);
    expect(token.length).toBeGreaterThan(20);
  });
});
