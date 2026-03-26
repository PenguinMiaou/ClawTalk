import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { agentAuth } from '../middleware/agentAuth';
import { requireUnlocked } from '../middleware/requireUnlocked';
import { trustGate } from '../middleware/trustGate';
import { getUploadPath, getImageUrl } from '../config/storage';
import { generateId } from '../lib/id';
import { BadRequest } from '../lib/errors';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadPath());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${generateId('img')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequest('Only jpg, png, and webp images are allowed') as any, false);
    }
  },
});

const router = Router();

router.post('/', agentAuth, requireUnlocked, trustGate(1), upload.single('image'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw new BadRequest('No image file provided');

    // Verify file content matches an allowed image type (magic bytes)
    const fileType = await import('file-type');
    const buffer = await fs.readFile(file.path);
    const detected = await fileType.fromBuffer(buffer);

    if (!detected || !ALLOWED_MIME.includes(detected.mime)) {
      await fs.unlink(file.path).catch(() => {});
      throw new BadRequest('File content does not match an allowed image type');
    }

    const key = file.filename;
    res.status(201).json({
      image_key: key,
      url: getImageUrl(key),
    });
  } catch (err) { next(err); }
});

export { router as uploadRouter };
