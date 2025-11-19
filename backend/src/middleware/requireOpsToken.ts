import type { NextFunction, Request, Response } from 'express';
import { validateOpsToken } from '../services/opsAuthService';

export function requireOpsToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = req.header('x-ops-token') || bearerToken;

  if (!validateOpsToken(token)) {
    res.status(401).json({ error: 'Ops password required or expired' });
    return;
  }

  next();
}
