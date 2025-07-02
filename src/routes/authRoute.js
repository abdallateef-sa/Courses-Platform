import express from 'express';
import {
  register, login, logout,forgotPassword, verifyResetCode, resetPassword} from '../controllers/authController.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import { registerRules } from '../utils/validators/authValidator.js';

const router = express.Router();

router.post('/register', upload.single('cardImage'), registerRules, register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

export default router;