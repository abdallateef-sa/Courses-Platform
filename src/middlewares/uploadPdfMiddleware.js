import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'src/uploads/pdfs'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `pdf-${Date.now()}${ext}`);
  }
});

export const uploadPdfs = multer({ storage });
