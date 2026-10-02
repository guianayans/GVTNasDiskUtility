import path from 'path';

const numberFromEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: numberFromEnv(process.env.PORT, 3010),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3010',
  appPassword: process.env.APP_PASSWORD ?? '',
  sambaConfigPath: process.env.SAMBA_CONFIG_PATH ?? '/etc/samba/smb.conf',
  publicSmbHost: process.env.PUBLIC_SMB_HOST ?? 'localhost',
  nasSmbUser: process.env.NAS_SMB_USER ?? 'nasuser',
  nasSmbGroup: process.env.NAS_SMB_GROUP ?? process.env.NAS_SMB_USER ?? 'nasuser',
  shareStatePath:
    process.env.SHARE_STATE_PATH ?? path.resolve(__dirname, '..', '..', 'data', 'share-state.json'),
  usernameMapPath: process.env.SAMBA_USERNAME_MAP ?? '/etc/samba/username.map',
  manualMountBase: process.env.MOUNT_BASE || '/media/gvtnas',
  minDeviceBytes: numberFromEnv(process.env.MIN_DEVICE_BYTES, 3 * 1024 * 1024 * 1024),
  allowedMountRoots: (process.env.ALLOWED_MOUNT_ROOTS || '/mnt,/media')
    .split(',')
    .map((root) => root.trim())
    .filter(Boolean),
  wireguardConfigPath: process.env.WIREGUARD_CONFIG_PATH ?? '/wg-config',
  // VPN embutida ligada? (variável WIREGUARD do compose; só "0", "false", "no" e "off" desligam)
  wireguardEnabled: !['0', 'false', 'no', 'off'].includes((process.env.WIREGUARD_ENABLED ?? '1').trim().toLowerCase()),
};
