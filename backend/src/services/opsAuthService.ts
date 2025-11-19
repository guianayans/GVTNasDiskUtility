import crypto from 'crypto';

interface OpsSession {
  token: string;
  expiresAt: number;
}

const OPS_TTL_MS = 5 * 60 * 1000; // 5 minutos
const opsSessions = new Map<string, OpsSession>();

export function createOpsSession() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + OPS_TTL_MS;
  opsSessions.set(token, { token, expiresAt });
  return { token, expiresAt };
}

export function validateOpsToken(token: string | undefined): boolean {
  if (!token) return false;
  const session = opsSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    opsSessions.delete(token);
    return false;
  }
  return true;
}

export function invalidateOpsToken(token: string) {
  opsSessions.delete(token);
}
