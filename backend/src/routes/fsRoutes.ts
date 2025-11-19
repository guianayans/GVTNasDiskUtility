import { Router } from 'express';
import multer from 'multer';
import { createZipArchive, getFileForDownload, listDirectory, removeEntry, saveUploadedFiles } from '../services/fsService';
import { requireOpsToken } from '../middleware/requireOpsToken';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

router.get('/fs/download', requireOpsToken, async (req, res, next) => {
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

router.get('/fs/download-zip', requireOpsToken, async (req, res, next) => {
  try {
    const targetPath = req.query.path as string;
    if (!targetPath) {
      res.status(400).json({ message: 'path query parameter is required' });
      return;
    }
    const { archive, archiveName } = await createZipArchive(targetPath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);
    archive.on('error', (err) => {
      next(err);
    });
    archive.pipe(res);
    archive.finalize();
  } catch (error) {
    next(error);
  }
});

router.delete('/fs/delete', async (req, res, next) => {
  try {
    const targetPath = req.body?.path as string;
    if (!targetPath) {
      res.status(400).json({ message: 'path in body is required' });
      return;
    }
    await removeEntry(targetPath);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/fs/upload', requireOpsToken, upload.array('files'), async (req, res, next) => {
  try {
    const targetPath = req.body?.targetPath as string;
    const files = req.files as Express.Multer.File[];
    if (!targetPath) {
      res.status(400).json({ message: 'targetPath is required' });
      return;
    }
    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No files sent' });
      return;
    }
    await saveUploadedFiles(
      targetPath,
      files.map((file) => ({ originalname: file.originalname, buffer: file.buffer }))
    );
    res.json({ success: true, count: files.length });
  } catch (error) {
    next(error);
  }
});

export default router;
