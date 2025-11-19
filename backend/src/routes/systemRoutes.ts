import { Router } from 'express';
import { getSystemInfo } from '../services/systemService';

const router = Router();

router.get('/system/info', async (_req, res, next) => {
  try {
    const info = await getSystemInfo();
    res.json(info);
  } catch (error) {
    next(error);
  }
});

export default router;
