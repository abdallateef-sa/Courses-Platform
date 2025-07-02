import { validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';

export const validatorMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) {
      const imagePath = path.join('src/uploads/images', req.file.filename);
      fs.existsSync(imagePath) && fs.unlinkSync(imagePath);
    }
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};