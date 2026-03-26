// Mock dotenv so it doesn't re-inject vars from .env file during tests
jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('env validation', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('exports env with default values in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DATABASE_URL;
    jest.resetModules();
    jest.mock('dotenv', () => ({ config: jest.fn() }));
    const { env } = require('../src/config/env');
    expect(env.DATABASE_URL).toContain('localhost');
  });

  it('throws in production when DATABASE_URL is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
    expect(() => {
      jest.resetModules();
      jest.mock('dotenv', () => ({ config: jest.fn() }));
      require('../src/config/env');
    }).toThrow('DATABASE_URL');
  });

  it('succeeds in production when DATABASE_URL is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://prod:prod@db:5432/clawtalk';
    expect(() => {
      jest.resetModules();
      jest.mock('dotenv', () => ({ config: jest.fn() }));
      require('../src/config/env');
    }).not.toThrow();
  });
});
