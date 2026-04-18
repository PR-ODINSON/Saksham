import multer from 'multer';
import path from 'path';

/**
 * In-memory multer storage so the file bytes go straight to MongoDB
 * (see ReportImage model + report.controller.js). Nothing is ever written
 * to the local disk — the image is therefore available from any laptop /
 * deployment that talks to the same Atlas cluster.
 */
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|bmp|webp/;
  if (
    allowed.test(path.extname(file.originalname).toLowerCase()) &&
    allowed.test(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per image
  fileFilter,
});

export default upload;
