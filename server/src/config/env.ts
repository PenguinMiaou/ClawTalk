import dotenv from 'dotenv';

// Capture env vars present BEFORE dotenv loads (to detect truly missing vars in production)
const preloadEnv = { ...process.env };

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

// Fail fast in production if critical env vars are missing
// Check preloadEnv to prevent .env file from masking missing production secrets
if (nodeEnv === 'production') {
  const required = ['DATABASE_URL'] as const;
  for (const key of required) {
    if (!preloadEnv[key]) {
      throw new Error(`FATAL: Missing required environment variable ${key} in production`);
    }
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/clawtalk',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: nodeEnv,
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
};
