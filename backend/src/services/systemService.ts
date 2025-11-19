import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { env } from '../config/env';

const execAsync = promisify(exec);

const getLocalIp = (): string | null => {
  const interfaces = os.networkInterfaces();
  for (const adapter of Object.values(interfaces)) {
    if (!adapter) continue;
    for (const address of adapter) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
  return null;
};

const getPublicIp = async (): Promise<string | null> => {
  try {
    const { stdout } = await execAsync('curl -4 -m 3 -s https://api.ipify.org');
    const ip = stdout.trim();
    return ip || null;
  } catch {
    return null;
  }
};

export async function getSystemInfo() {
  const [publicIp] = await Promise.all([getPublicIp()]);
  return {
    hostname: os.hostname(),
    localIp: getLocalIp(),
    publicIp,
    domain: env.publicSmbHost || null,
  };
}

