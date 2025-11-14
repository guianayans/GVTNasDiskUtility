import path from 'path';
import { env } from '../config/env';

const allowedRoots = env.allowedMountRoots;

export function resolveSafePath(inputPath: string): string {
  if (!inputPath) {
    throw new Error('Path is required');
  }
  const normalized = path.resolve(inputPath);
  const isAllowed = allowedRoots.some((root) => normalized === root || normalized.startsWith(`${root}/`));
  if (!isAllowed) {
    throw new Error('Path is outside of allowed mount roots');
  }
  return normalized;
}

export function getAllowedRoots(): string[] {
  return allowedRoots;
}
