import fs from 'fs-extra';
import path from 'path';
import { env } from '../config/env';

export type ShareType = 'timeMachine' | 'clonezilla' | 'ftp';

export interface ShareEntry {
  shareName: string;
  mountPoint: string;
  type: ShareType;
  smbPath: string;
  options?: Record<string, string | number | boolean>;
}

interface ShareState {
  shares: ShareEntry[];
}

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');
const SHARE_STATE_FILE = env.shareStatePath;

async function ensureDataFile(): Promise<void> {
  await fs.ensureDir(path.dirname(SHARE_STATE_FILE));
  if (!(await fs.pathExists(SHARE_STATE_FILE))) {
    const emptyState: ShareState = { shares: [] };
    await fs.writeJson(SHARE_STATE_FILE, emptyState, { spaces: 2 });
  }
}

export async function loadShareState(): Promise<ShareState> {
  await ensureDataFile();
  return fs.readJson(SHARE_STATE_FILE);
}

export async function saveShareState(state: ShareState): Promise<void> {
  await ensureDataFile();
  await fs.writeJson(SHARE_STATE_FILE, state, { spaces: 2 });
}

export async function upsertShare(entry: ShareEntry): Promise<ShareState> {
  const state = await loadShareState();
  const existingIndex = state.shares.findIndex((item) => item.shareName === entry.shareName);
  if (existingIndex >= 0) {
    state.shares[existingIndex] = entry;
  } else {
    state.shares.push(entry);
  }
  await saveShareState(state);
  return state;
}

export async function removeShare(shareName: string): Promise<ShareState> {
  const state = await loadShareState();
  const nextShares = state.shares.filter((item) => item.shareName !== shareName);
  state.shares = nextShares;
  await saveShareState(state);
  return state;
}

export async function clearShares(): Promise<void> {
  await fs.ensureDir(path.dirname(SHARE_STATE_FILE));
  await fs.writeJson(SHARE_STATE_FILE, { shares: [] }, { spaces: 2 });
}

export async function findShareByMountPoint(mountPoint: string): Promise<ShareEntry | undefined> {
  const state = await loadShareState();
  return state.shares.find((item) => item.mountPoint === mountPoint);
}

export { ShareState, SHARE_STATE_FILE };
