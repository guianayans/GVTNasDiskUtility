import fs from 'fs-extra';
import path from 'path';
import { env } from '../config/env';
import { runCommand } from '../utils/command';

export const NAS_USER = env.nasSmbUser;
export const NAS_GROUP = env.nasSmbGroup;
export const USERNAME_MAP_PATH = env.usernameMapPath;

let cachedIds: { uid: string; gid: string } | null = null;

export async function getNasUserIds(): Promise<{ uid: string; gid: string }> {
  if (cachedIds) return cachedIds;
  const [{ stdout: uidStdout }, { stdout: gidStdout }] = await Promise.all([
    runCommand('id', ['-u', NAS_USER]),
    runCommand('id', ['-g', NAS_GROUP]),
  ]);
  cachedIds = { uid: uidStdout.trim(), gid: gidStdout.trim() };
  return cachedIds;
}

export async function ensureUsernameMap(): Promise<void> {
  await fs.ensureDir(path.dirname(USERNAME_MAP_PATH));
  let lines: string[] = [];
  if (await fs.pathExists(USERNAME_MAP_PATH)) {
    const existing = await fs.readFile(USERNAME_MAP_PATH, 'utf8');
    lines = existing.split('\n').map((line) => line.trim()).filter(Boolean);
  }
  const aliasLinePrefix = `${NAS_USER} =`;
  const existingIndex = lines.findIndex((line) => line.startsWith(aliasLinePrefix));
  if (existingIndex >= 0) {
    const aliases = lines[existingIndex]
      .slice(aliasLinePrefix.length)
      .split(/\s+/)
      .filter(Boolean);
    if (!aliases.includes('root')) {
      aliases.push('root');
    }
    lines[existingIndex] = `${aliasLinePrefix} ${aliases.join(' ')}`.trim();
  } else {
    lines.push(`${NAS_USER} = root`);
  }
  await fs.writeFile(USERNAME_MAP_PATH, `${lines.join('\n')}\n`, 'utf8');
}
