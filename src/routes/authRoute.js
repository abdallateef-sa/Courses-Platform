import express from "express";
import {
  register,
  login,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  allowStudentLogin,
  getLoggedInStudents,
} from "../controllers/authController.js";
import { uploadImage } from "../middlewares/uploadImagesMiddleware.js";
import { registerRules } from "../utils/validators/authValidator.js";
import { loginLimiter } from "../middlewares/loginLimiter.js";
import { isAuth } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.post(
  "/register",
  uploadImage.single("cardImage"),
  registerRules,
  register
);
router.post("/login", loginLimiter, login);
router.post("/logout", isAuth, logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);

// Admin only
router.post("/allow-student-login", isAuth, isAdmin, allowStudentLogin);
router.get("/logged-in-students", isAuth, isAdmin, getLoggedInStudents);

export default router;
