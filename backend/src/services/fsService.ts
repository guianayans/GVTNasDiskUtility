import fs from 'fs-extra';
import path from 'path';
import type { Dirent } from 'fs';
import { resolveSafePath } from '../utils/pathUtils';

export interface FsEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

export async function listDirectory(targetPath: string): Promise<FsEntry[]> {
  const safePath = resolveSafePath(targetPath);
  const entries = (await fs.readdir(safePath, { withFileTypes: true })) as Dirent[];

  const result = await Promise.all(
    entries.map(async (entry: Dirent) => {
      const fullPath = path.join(safePath, entry.name);
      const stats = await fs.stat(fullPath);
      return {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };
    })
  );

  return result.sort((a: FsEntry, b: FsEntry) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getFileForDownload(targetPath: string): Promise<{ path: string; name: string }>
{
  const safePath = resolveSafePath(targetPath);
  const stats = await fs.stat(safePath);
  if (!stats.isFile()) {
    throw new Error('Requested path is not a file');
  }
  return { path: safePath, name: path.basename(safePath) };
}
