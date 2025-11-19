import { Router } from 'express';
import { env } from '../config/env';
import { createOpsSession } from '../services/opsAuthService';
import { getClientIp } from '../utils/ip';

interface IpSecurityState {
  attempts: number;
  blockedUntil: number;
}

const MAX_ATTEMPTS = 3;
const BLOCK_MS = 60 * 60 * 1000;
const ipSecurity = new Map<string, IpSecurityState>();

const router = Router();

router.post('/ops-auth', (req, res) => {
  if (!env.appPassword) {
    res.status(500).json({ error: 'APP_PASSWORD is not configured.' });
    return;
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const state = ipSecurity.get(ip) ?? { attempts: 0, blockedUntil: 0 };

  if (state.blockedUntil && now < state.blockedUntil) {
    res.status(429).json({ error: 'Muitas tentativas inválidas. Tente novamente em alguns minutos.' });
    return;
  }

  const { password } = req.body as { password?: string };
  if (!password) {
    res.status(400).json({ error: 'Senha obrigatória.' });
    return;
  }

  if (password !== env.appPassword) {
    state.attempts += 1;
    if (state.attempts >= MAX_ATTEMPTS) {
      state.blockedUntil = now + BLOCK_MS;
    }
    ipSecurity.set(ip, state);

    if (state.blockedUntil && now < state.blockedUntil) {
      res.status(429).json({ error: 'Muitas tentativas inválidas. Seu acesso foi temporariamente bloqueado.' });
      return;
    }

    res.status(401).json({ error: 'Senha inválida.' });
    return;
  }

  state.attempts = 0;
  state.blockedUntil = 0;
  ipSecurity.set(ip, state);

  const session = createOpsSession();
  res.json(session);
});

export default router;
