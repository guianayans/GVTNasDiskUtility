import { Router } from 'express';
import { getPeerAssets, listPeers } from '../services/wireguardService';
import { env } from '../config/env';

const router = Router();

router.get('/wireguard/peers', async (_req, res, next) => {
  try {
    // VPN embutida desligada: não oferece configurações de uma VPN que não está no ar
    const peers = env.wireguardEnabled ? await listPeers() : [];
    res.json({ enabled: env.wireguardEnabled, peers });
  } catch (error) {
    next(error);
  }
});

router.get('/wireguard/:peer/qr', async (req, res, next) => {
  try {
    if (!env.wireguardEnabled) {
      res.status(404).json({ message: 'WireGuard disabled' });
      return;
    }
    const peer = req.params.peer;
    const payload = await getPeerAssets(peer);
    if (!payload) {
      res.status(404).json({ message: 'Peer not found' });
      return;
    }
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;
