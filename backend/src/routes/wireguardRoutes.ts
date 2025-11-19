import { Router } from 'express';
import { getPeerAssets, listPeers } from '../services/wireguardService';

const router = Router();

router.get('/wireguard/peers', async (_req, res, next) => {
  try {
    const peers = await listPeers();
    res.json({ peers });
  } catch (error) {
    next(error);
  }
});

router.get('/wireguard/:peer/qr', async (req, res, next) => {
  try {
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
