import { nanoid } from 'nanoid';

export function generateId(prefix: string): string {
  return `${prefix}_${nanoid(12)}`;
}

export function generateToken(prefix: string): string {
  return `${prefix}_${nanoid(32)}`;
}
