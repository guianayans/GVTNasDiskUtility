import fs from 'fs-extra';
import path from 'path';
import type { Dirent } from 'fs';
import archiver from 'archiver';
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

export async function removeEntry(targetPath: string): Promise<void> {
  const safePath = resolveSafePath(targetPath);
  await fs.remove(safePath);
}

export async function createZipArchive(targetPath: string) {
  const safePath = resolveSafePath(targetPath);
  const stats = await fs.stat(safePath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  const baseName = path.basename(safePath) || 'arquivos';

  if (stats.isDirectory()) {
    archive.directory(safePath, false);
  } else {
    archive.file(safePath, { name: baseName });
  }

  return { archive, archiveName: `${baseName}.zip` };
}

export async function saveUploadedFiles(targetDir: string, files: Array<{ originalname: string; buffer: Buffer }>) {
  const safeDir = resolveSafePath(targetDir);
  const stats = await fs.stat(safeDir);
  if (!stats.isDirectory()) {
    throw new Error('Target path must be a directory');
  }
  await Promise.all(
    files.map(async (file) => {
      const dest = path.join(safeDir, file.originalname);
      await fs.writeFile(dest, file.buffer);
    })
  );
}
