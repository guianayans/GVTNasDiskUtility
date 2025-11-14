export interface DiskUsage {
  total: number;
  used: number;
  available: number;
  percentUsed: number;
}

export interface ShareEntry {
  shareName: string;
  mountPoint: string;
  type: 'timeMachine' | 'clonezilla' | 'ftp';
  smbPath: string;
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

export interface FsEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}
