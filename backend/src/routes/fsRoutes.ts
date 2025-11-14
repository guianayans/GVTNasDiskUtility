import { Router } from 'express';
import { getFileForDownload, listDirectory } from '../services/fsService';

const router = Router();

router.get('/fs/list', async (req, res, next) => {
  try {
    const targetPath = req.query.path as string;
    if (!targetPath) {
      res.status(400).json({ message: 'path query parameter is required' });
      return;
    }
    const entries = await listDirectory(targetPath);
    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

router.get('/fs/download', async (req, res, next) => {
  try {
    const targetPath = req.query.path as string;
    if (!targetPath) {
      res.status(400).json({ message: 'path query parameter is required' });
      return;
    }
    const file = await getFileForDownload(targetPath);
    res.download(file.path, file.name);
  } catch (error) {
    next(error);
  }
});

export default router;
