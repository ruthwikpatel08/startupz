import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve server uploads directory (server/public/uploads)
const uploadDir = path.resolve(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Fallback upload directory at root level
const rootUploadDir = path.resolve('public/uploads');
if (!fs.existsSync(rootUploadDir)) {
  try {
    fs.mkdirSync(rootUploadDir, { recursive: true });
  } catch {}
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanExt = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path
      .basename(file.originalname, cleanExt)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    cb(null, `${safeBaseName || 'file'}-${uniqueSuffix}${cleanExt}`);
  },
});

// Allow ANY kind of file, photo, document, archive, or media up to 50MB
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow all files without restrictions
    cb(null, true);
  },
});

// POST /api/upload
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    // Also mirror to root uploads folder if distinct so static serving resolves under any working directory
    if (rootUploadDir !== uploadDir && fs.existsSync(rootUploadDir)) {
      try {
        fs.copyFileSync(req.file.path, path.join(rootUploadDir, req.file.filename));
      } catch {}
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      message: 'File uploaded successfully!',
      url: fileUrl,
      filename: req.file.originalname || req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'File upload failed.' });
  }
});

export default router;
