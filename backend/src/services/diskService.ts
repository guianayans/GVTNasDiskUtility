import fs from 'fs-extra';
import path from 'path';
import { env } from '../config/env';
import { runCommand, tryCommand } from '../utils/command';
import { ShareEntry, loadShareState } from './shareState';
import { NAS_GROUP, NAS_USER, getNasUserIds } from './nasUserConfig';

const LSBLK_COLUMNS = 'NAME,KNAME,TYPE,MOUNTPOINT,LABEL,UUID,FSTYPE,RM,HOTPLUG,SIZE,MODEL,ROTA';
const AUTO_MOUNT_FS = new Set(['ext4', 'ext3', 'ext2', 'vfat', 'fat32', 'ntfs', 'exfat', 'apfs']);
const attemptedAutoMount = new Set<string>();
const MIN_DEVICE_BYTES = env.minDeviceBytes;
const MANUAL_MOUNT_BASE = env.manualMountBase;

interface RawBlockDevice {
  name: string;
  kname?: string;
  type: string;
  mountpoint?: string;
  label?: string;
  uuid?: string;
  fstype?: string;
  rm?: boolean | number | string;
  hotplug?: boolean | number | string;
  size?: string;
  model?: string;
  rota?: boolean | number | string;
  children?: RawBlockDevice[];
}

export interface DiskUsage {
  total: number;
  used: number;
  available: number;
  percentUsed: number;
}

export interface DiskNode {
  id: string;
  name: string;
  label?: string;
  size?: string;
  sizeBytes?: number;
  type: string;
  device: string;
  model?: string;
  isMounted: boolean;
  mountpoint?: string;
  filesystem?: string;
  uuid?: string;
  removable: boolean;
  hotplug: boolean;
  rotational?: boolean;
  usage?: DiskUsage;
  children?: DiskNode[];
  shares?: ShareEntry[];
}

export interface DiskResponse {
  internal: DiskNode[];
  external: DiskNode[];
  shares: ShareEntry[];
  timestamp: string;
}

export async function getDisks(): Promise<DiskResponse> {
  let devices = await readLsblk();
  const unmountedSmall = await ensureSmallDevicesUnmounted(devices);
  if (unmountedSmall) {
    devices = await readLsblk();
  }
  const autoMounted = await autoMountDevices(devices);
  if (autoMounted) {
    devices = await readLsblk();
  }

  const shareState = await loadShareState();
  const usageMap = await collectUsageMap(devices);
  const { internal, external } = splitDevices(devices, usageMap, shareState.shares);

  return {
    internal,
    external,
    shares: shareState.shares,
    timestamp: new Date().toISOString(),
  };
}

export async function mountDevice(device: string): Promise<void> {
  await mountWithFallback(device);
}

export async function unmountDevice(device: string): Promise<void> {
  const success = await tryCommand('udisksctl', ['unmount', '-b', device]);
  if (success) return;
  await runCommand('umount', [device]);
}

async function readLsblk(): Promise<RawBlockDevice[]> {
  const { stdout } = await runCommand('lsblk', ['-J', '-o', LSBLK_COLUMNS]);
  const parsed = JSON.parse(stdout);
  return parsed.blockdevices as RawBlockDevice[];
}

async function autoMountDevices(devices: RawBlockDevice[]): Promise<boolean> {
  let mountedAny = false;
  for (const device of devices) {
    mountedAny = (await autoMountTree(device)) || mountedAny;
  }
  return mountedAny;
}

async function autoMountTree(device: RawBlockDevice): Promise<boolean> {
  let mounted = false;
  if (shouldAutoMount(device)) {
    const id = device.kname ?? device.name;
    if (!attemptedAutoMount.has(id)) {
      attemptedAutoMount.add(id);
      try {
        await mountWithFallback(`/dev/${id}`);
        mounted = true;
      } catch (error) {
        console.warn(`Auto-mount failed for /dev/${id}: ${(error as Error).message}`);
      }
    }
  }

  if (device.children) {
    for (const child of device.children) {
      mounted = (await autoMountTree(child)) || mounted;
    }
  }
  return mounted;
}

function shouldAutoMount(device: RawBlockDevice): boolean {
  if (!device.fstype) return false;
  if (device.mountpoint) return false;
  if (device.type !== 'part') return false;
  if (!AUTO_MOUNT_FS.has(device.fstype.toLowerCase())) return false;
  const removable = parseBool(device.rm) || parseBool(device.hotplug);
  const sizeBytes = parseSizeToBytes(device.size);
  if (typeof sizeBytes === 'number' && sizeBytes < MIN_DEVICE_BYTES) {
    return false;
  }
  return Boolean(removable);
}

async function collectUsageMap(devices: RawBlockDevice[]): Promise<Map<string, DiskUsage>> {
  const mountpoints = new Set<string>();
  traverseDevices(devices, (device) => {
    if (device.mountpoint) {
      mountpoints.add(device.mountpoint);
    }
  });

  const usageEntries = await Promise.all(
    Array.from(mountpoints).map(async (mountpoint) => {
      const usage = await getUsageForMountpoint(mountpoint);
      return [mountpoint, usage] as const;
    })
  );

  const usageMap = new Map<string, DiskUsage>();
  usageEntries.forEach(([mountpoint, usage]) => {
    if (usage) {
      usageMap.set(mountpoint, usage);
    }
  });
  return usageMap;
}

function traverseDevices(devices: RawBlockDevice[] | undefined, cb: (device: RawBlockDevice) => void): void {
  if (!devices) return;
  for (const device of devices) {
    cb(device);
    if (device.children) {
      traverseDevices(device.children, cb);
    }
  }
}

async function getUsageForMountpoint(mountpoint: string): Promise<DiskUsage | undefined> {
  try {
    const { stdout } = await runCommand('df', ['-kP', mountpoint]);
    const lines = stdout.trim().split('\n');
    if (lines.length < 2) return undefined;
    const parts = lines[lines.length - 1].split(/\s+/);
    const total = Number(parts[1]) * 1024;
    const used = Number(parts[2]) * 1024;
    const available = Number(parts[3]) * 1024;
    const percentUsed = Number(parts[4].replace('%', ''));
    return { total, used, available, percentUsed };
  } catch {
    return undefined;
  }
}

function splitDevices(devices: RawBlockDevice[], usageMap: Map<string, DiskUsage>, shares: ShareEntry[]): {
  internal: DiskNode[];
  external: DiskNode[];
} {
  const internal: DiskNode[] = [];
  const external: DiskNode[] = [];

  for (const device of devices) {
    const node = pruneNode(toDiskNode(device, usageMap, shares));
    if (!node) continue;
    if (isExternal(device)) {
      external.push(node);
    } else {
      internal.push(node);
    }
  }

  return { internal, external };
}

function toDiskNode(device: RawBlockDevice, usageMap: Map<string, DiskUsage>, shares: ShareEntry[]): DiskNode {
  const mountpoint = device.mountpoint ?? undefined;
  const nodeShares = mountpoint ? shares.filter((share) => share.mountPoint === mountpoint) : [];
  const sizeBytes = parseSizeToBytes(device.size);
  return {
    id: device.name,
    name: device.label || device.name,
    label: device.label,
    size: device.size,
    sizeBytes,
    type: device.type,
    device: `/dev/${device.kname ?? device.name}`,
    model: device.model,
    isMounted: Boolean(mountpoint),
    mountpoint,
    filesystem: device.fstype,
    uuid: device.uuid,
    removable: isExternal(device),
    hotplug: parseBool(device.hotplug),
    rotational: parseBool(device.rota),
    usage: mountpoint ? usageMap.get(mountpoint) : undefined,
    children: device.children?.map((child) => toDiskNode(child, usageMap, shares)) ?? [],
    shares: nodeShares,
  };
}

function isExternal(device: RawBlockDevice): boolean {
  return Boolean(parseBool(device.rm) || parseBool(device.hotplug));
}

function parseBool(input?: string | number | boolean): boolean {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'number') return input === 1;
  if (typeof input === 'string') return input === '1' || input.toLowerCase() === 'true';
  return false;
}

function parseSizeToBytes(size?: string): number | undefined {
  if (!size) return undefined;
  const match = size.match(/^([\d.]+)([KMGTP]?)(i?B)?$/i);
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return undefined;
  const unit = match[2].toUpperCase();
  const unitMap: Record<string, number> = {
    '': 1,
    K: 1024,
    M: 1024 ** 2,
    G: 1024 ** 3,
    T: 1024 ** 4,
    P: 1024 ** 5,
  };
  return value * (unitMap[unit] || 1);
}

function pruneNode(node: DiskNode): DiskNode | null {
  if (node.children) {
    node.children = node.children
      .map((child) => pruneNode(child))
      .filter((child): child is DiskNode => Boolean(child));
  }

  const isTinyDisk =
    typeof node.sizeBytes === 'number' &&
    node.sizeBytes < MIN_DEVICE_BYTES &&
    (node.type === 'disk' || node.type === 'loop');

  if (isTinyDisk) {
    return null;
  }

  return node;
}

async function mountWithFallback(device: string): Promise<void> {
  const udisks = await tryCommand('udisksctl', ['mount', '-b', device]);
  if (!udisks) {
    await manualMount(device);
  }
  await applyPermissionsForDevice(device);
}

async function manualMount(device: string): Promise<void> {
  const mountPoint = await ensureMountPoint(device);
  const fsTypeResult = await tryCommand('blkid', ['-o', 'value', '-s', 'TYPE', device]);
  const fsType = fsTypeResult?.stdout.trim();
  const mountArgs: string[] = [];
  if (fsType) {
    mountArgs.push('-t', fsType);
  }
  const options = await buildMountOptions(fsType);
  if (options) {
    mountArgs.push('-o', options);
  }
  mountArgs.push(device, mountPoint);
  await runCommand('mount', mountArgs);
}

async function ensureMountPoint(device: string): Promise<string> {
  const dirName = path.basename(device);
  const mountPoint = path.join(MANUAL_MOUNT_BASE, dirName);
  await fs.ensureDir(MANUAL_MOUNT_BASE);
  await fs.ensureDir(mountPoint);
  return mountPoint;
}

const UID_MOUNT_TYPES = new Set(['vfat', 'fat32', 'exfat', 'ntfs']);

async function buildMountOptions(fsType?: string): Promise<string | undefined> {
  if (!fsType) return undefined;
  const lower = fsType.toLowerCase();
  if (!UID_MOUNT_TYPES.has(lower)) return undefined;
  const ids = await getNasUserIds();
  return `uid=${ids.uid},gid=${ids.gid},umask=002`;
}

async function applyPermissionsForDevice(device: string): Promise<void> {
  const mountPoint = await findMountPoint(device);
  if (!mountPoint) return;
  try {
    await runCommand('chown', ['-R', `${NAS_USER}:${NAS_GROUP}`, mountPoint]);
    await runCommand('chmod', ['-R', '775', mountPoint]);
  } catch (error) {
    console.warn(`Failed to adjust permissions for ${mountPoint}: ${(error as Error).message}`);
  }
}

async function ensureSmallDevicesUnmounted(devices: RawBlockDevice[]): Promise<boolean> {
  const tasks: Promise<void>[] = [];
  traverseDevices(devices, (device) => {
    if (!device.mountpoint) return;
    const sizeBytes = parseSizeToBytes(device.size);
    if (typeof sizeBytes === 'number' && sizeBytes < MIN_DEVICE_BYTES) {
      tasks.push(unmountByDevice(device));
    }
  });
  if (tasks.length === 0) return false;
  await Promise.all(tasks);
  return true;
}

async function unmountByDevice(device: RawBlockDevice): Promise<void> {
  const devPath = `/dev/${device.kname ?? device.name}`;
  const success = await tryCommand('udisksctl', ['unmount', '-b', devPath]);
  if (success) return;
  await tryCommand('umount', [devPath]);
}

async function findMountPoint(device: string): Promise<string | undefined> {
  const devName = path.basename(device);
  const { stdout } = await runCommand('lsblk', ['-J', '-o', 'KNAME,MOUNTPOINT']);
  const parsed = JSON.parse(stdout) as { blockdevices: Array<{ kname?: string; mountpoint?: string; children?: any[] }> };

  const search = (nodes?: Array<{ kname?: string; mountpoint?: string; children?: any[] }>): string | undefined => {
    if (!nodes) return undefined;
    for (const node of nodes) {
      if (node.kname === devName && node.mountpoint) {
        return node.mountpoint;
      }
      const childResult = search(node.children);
      if (childResult) return childResult;
    }
    return undefined;
  };

  return search(parsed.blockdevices);
}
