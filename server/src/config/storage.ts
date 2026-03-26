import path from 'path';
import { env } from './env';
import fs from 'fs';

export function getUploadPath(): string {
  const dir = path.resolve(env.UPLOAD_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getImageUrl(key: string): string {
  return `/uploads/${key}`;
}
