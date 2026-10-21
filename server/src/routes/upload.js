import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

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

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
]);

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

// Enforce strict file types, block scripts, and cap size to 10MB (SEC-04)
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB maximum limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(
        new Error(`Unsupported file extension '${ext}'. Allowed formats: .jpg, .jpeg, .png, .webp, .gif, .pdf`),
        false
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return cb(
        new Error(`Unsupported file content type '${mime}'. Allowed formats: images and PDF documents.`),
        false
      );
    }

    cb(null, true);
  },
});

const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Upload rate limit reached. Please wait a few minutes before uploading more files.',
});

export function validateFileMagicBytes(filePath, ext) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (ext === '.jpg' || ext === '.jpeg') {
      return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    }
    // PNG: 89 50 4E 47
    if (ext === '.png') {
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    }
    // GIF: GIF8 (47 49 46 38)
    if (ext === '.gif') {
      return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
    }
    // WEBP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
    if (ext === '.webp') {
      return (
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x42 && buffer[10] === 0x45 && buffer[11] === 0x50
      );
    }
    // PDF: %PDF (25 50 44 46)
    if (ext === '.pdf') {
      return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    }

    return false;
  } catch {
    return false;
  }
}

// POST /api/upload
router.post('/', requireAuth, uploadLimiter, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum allowed size is 10MB.' });
      }
      return res.status(400).json({ error: err.message || 'Invalid upload request.' });
    }

    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

      const cleanExt = path.extname(req.file.originalname).toLowerCase();

      // Deep inspection: verify file magic bytes / file signature (SEC-04)
      if (!validateFileMagicBytes(req.file.path, cleanExt)) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({
          error: 'File content does not match its declared format. Upload rejected for security reasons.',
        });
      }

      // Mirror to root uploads folder if distinct
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
});

export default router;
