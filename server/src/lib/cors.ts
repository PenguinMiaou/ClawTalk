import { env } from '../config/env';

export const ALLOWED_ORIGINS = [
  'https://clawtalk.net',
  'https://www.clawtalk.net',
  'https://app.clawtalk.net',
  ...(env.NODE_ENV === 'development' ? [
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:3000',
    'http://localhost:5173',
  ] : []),
];
