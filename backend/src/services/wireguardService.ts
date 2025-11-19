import path from 'path';
import { promises as fs } from 'fs';
import { env } from '../config/env';

interface PeerInfo {
  name: string;
  hasQr: boolean;
  hasConf: boolean;
}

export async function listPeers(): Promise<PeerInfo[]> {
  const base = env.wireguardConfigPath;
  try {
    const entries = await fs.readdir(base, { withFileTypes: true });
    const peers = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('peer'))
        .map(async (entry) => {
          const peer = entry.name.replace(/^peer_?/, '');
          const dir = path.join(base, entry.name);
          const { hasQr, hasConf } = await resolveAssets(dir, peer, entry.name);
          return { name: peer, hasQr, hasConf };
        })
    );
    return peers.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn('WireGuard peers not available:', (error as Error).message);
    return [];
  }
}

export async function getPeerAssets(peer: string) {
  const safePeer = sanitizePeerName(peer);
  const base = env.wireguardConfigPath;
  const candidateDirs = [
    path.join(base, `peer_${safePeer}`),
    path.join(base, `peer${safePeer}`),
    path.join(base, safePeer),
  ];

  for (const dir of candidateDirs) {
    const exists = await fileExists(dir);
    if (!exists) continue;
    const { qrPath, confPath } = await resolveAssetPaths(dir, safePeer);
    const [qrImage, confContent] = await Promise.all([
      qrPath ? readBase64Image(qrPath) : Promise.resolve(null),
      confPath ? readText(confPath) : Promise.resolve(null),
    ]);
    return {
      peer: safePeer,
      qrImage,
      confContent,
    };
  }
  return null;
}

async function resolveAssets(dir: string, peer: string, original: string) {
  const { qrPath, confPath } = await resolveAssetPaths(dir, peer, original);
  return {
    hasQr: Boolean(qrPath),
    hasConf: Boolean(confPath),
  };
}

async function resolveAssetPaths(dir: string, peer: string, original?: string) {
  const names = Array.from(
    new Set([
      `peer_${peer}`,
      `peer-${peer}`,
      `peer${peer}`,
      original,
      peer,
    ].filter(Boolean))
  );
  let qrPath: string | null = null;
  let confPath: string | null = null;
  for (const name of names) {
    if (!qrPath) {
      const candidate = path.join(dir, `${name}.png`);
      if (await fileExists(candidate)) qrPath = candidate;
    }
    if (!confPath) {
      const candidate = path.join(dir, `${name}.conf`);
      if (await fileExists(candidate)) confPath = candidate;
    }
  }
  return { qrPath, confPath };
}

async function fileExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readBase64Image(filePath: string) {
  const buffer = await fs.readFile(filePath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function readText(filePath: string) {
  const buffer = await fs.readFile(filePath, 'utf-8');
  return buffer;
}

function sanitizePeerName(peer: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(peer)) {
    throw new Error('Invalid peer name');
  }
  return peer;
}
