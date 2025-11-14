import { Router } from 'express';
import { disableShare, enableShare, listShares, resetAllShares } from '../services/sambaService';

const router = Router();

router.get('/shares', async (_req, res, next) => {
  try {
    const shares = await listShares();
    res.json({ shares });
  } catch (error) {
    next(error);
  }
});

router.post('/time-machine/enable', async (req, res, next) => {
  try {
    const { mountPoint, shareName, maxSizeGb } = req.body as {
      mountPoint?: string;
      shareName?: string;
      maxSizeGb?: number;
    };
    if (!mountPoint || !shareName) {
      res.status(400).json({ message: 'mountPoint and shareName are required' });
      return;
    }
    const share = await enableShare({ mountPoint, shareName, type: 'timeMachine', maxSizeGb });
    res.json({ message: 'Time Machine share configured', share });
  } catch (error) {
    next(error);
  }
});

router.post('/time-machine/disable', async (req, res, next) => {
  try {
    const { shareName } = req.body as { shareName?: string };
    if (!shareName) {
      res.status(400).json({ message: 'shareName is required' });
      return;
    }
    await disableShare(shareName);
    res.json({ message: 'Time Machine share removed' });
  } catch (error) {
    next(error);
  }
});

router.post('/clonezilla/enable', async (req, res, next) => {
  try {
    const { mountPoint, shareName } = req.body as { mountPoint?: string; shareName?: string };
    if (!mountPoint || !shareName) {
      res.status(400).json({ message: 'mountPoint and shareName are required' });
      return;
    }
    const share = await enableShare({ mountPoint, shareName, type: 'clonezilla' });
    res.json({ message: 'Clonezilla share configured', share });
  } catch (error) {
    next(error);
  }
});

router.post('/clonezilla/disable', async (req, res, next) => {
  try {
    const { shareName } = req.body as { shareName?: string };
    if (!shareName) {
      res.status(400).json({ message: 'shareName is required' });
      return;
    }
    await disableShare(shareName);
    res.json({ message: 'Clonezilla share removed' });
  } catch (error) {
    next(error);
  }
});

router.post('/ftp/enable', async (req, res, next) => {
  try {
    const { mountPoint, shareName } = req.body as { mountPoint?: string; shareName?: string };
    if (!mountPoint || !shareName) {
      res.status(400).json({ message: 'mountPoint and shareName are required' });
      return;
    }
    const share = await enableShare({ mountPoint, shareName, type: 'ftp' });
    res.json({ message: 'FTP share configured', share });
  } catch (error) {
    next(error);
  }
});

router.post('/ftp/disable', async (req, res, next) => {
  try {
    const { shareName } = req.body as { shareName?: string };
    if (!shareName) {
      res.status(400).json({ message: 'shareName is required' });
      return;
    }
    await disableShare(shareName);
    res.json({ message: 'FTP share removed' });
  } catch (error) {
    next(error);
  }
});

router.post('/smb/reset', async (_req, res, next) => {
  try {
    await resetAllShares();
    res.json({ message: 'Todos os shares SMB foram removidos', shares: [] });
  } catch (error) {
    next(error);
  }
});

export default router;
