import { Router } from 'express';
import { getDisks, mountDevice, unmountDevice } from '../services/diskService';

const router = Router();

router.get('/disks', async (_req, res, next) => {
  try {
    const data = await getDisks();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/mount', async (req, res, next) => {
  try {
    const { device } = req.body as { device?: string };
    if (!device) {
      res.status(400).json({ message: 'device is required' });
      return;
    }
    await mountDevice(device);
    const data = await getDisks();
    res.json({ message: 'Mounted successfully', disks: data });
  } catch (error) {
    next(error);
  }
});

router.post('/unmount', async (req, res, next) => {
  try {
    const { device } = req.body as { device?: string };
    if (!device) {
      res.status(400).json({ message: 'device is required' });
      return;
    }
    await unmountDevice(device);
    const data = await getDisks();
    res.json({ message: 'Unmounted successfully', disks: data });
  } catch (error) {
    next(error);
  }
});

export default router;
