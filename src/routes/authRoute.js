import express from 'express';
import {
  register, login, logout,forgotPassword, verifyResetCode, resetPassword} from '../controllers/authController.js';
import { uploadImage } from '../middlewares/uploadImagesMiddleware.js';
import { registerRules } from '../utils/validators/authValidator.js';
import { loginLimiter } from '../middlewares/loginLimiter.js';

const router = express.Router();

router.post('/register', uploadImage.single('cardImage'), registerRules, register);
router.post('/login',loginLimiter ,login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

export default router;