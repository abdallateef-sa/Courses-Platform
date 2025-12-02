import express from "express";
import {
  registerStudent,
  registerAdmin,
  verifyStudentRegistration,
  login,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from "../controllers/authController.js";
import { uploadImage } from "../middlewares/uploadImagesMiddleware.js";
import { registerRules } from "../utils/validators/authValidator.js"; // existing rules cover student fields
import { loginLimiter } from "../middlewares/loginLimiter.js";
import { isAuth } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Routes
// Student registration (requires card image & academic fields)
router.post(
  "/register/student",
  uploadImage.single("cardImage"),
  registerRules,
  registerStudent
);
// Verify student registration OTP and create account
router.post("/register/student/verify", verifyStudentRegistration);

// Admin registration (basic fields only)
router.post("/register/admin", registerAdmin);
router.post("/login", loginLimiter, login);
router.post("/logout", isAuth, logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);

export default router;

/**
 * @swagger
 * /api/v1/auth/register/student:
 *   post:
 *     summary: Register new student
 *     description: Register a student account (requires academic data and card image)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - phone
 *               - year
 *               - departmentType
 *               - university
 *               - cardImage
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Ahmed Mohamed Ali"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ahmed@student.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *               phone:
 *                 type: string
 *                 example: "+201234567890"
 *               year:
 *                 type: integer
 *                 example: 3
 *               departmentType:
 *                 type: string
 *                 enum: [public, private]
 *                 example: "public"
 *               university:
 *                 type: string
 *                 example: "Cairo University"
 *               cardImage:
 *                 type: string
 *                 format: binary
 *                 description: Student ID card image
 *     responses:
 *       201:
 *         description: Student registered successfully
 *       400:
 *         description: Validation or business logic error
 *       409:
 *         description: Email or phone exists
 *
 * @swagger
 * /api/v1/auth/register/student/verify:
 *   post:
 *     summary: Verify student email OTP
 *     description: Verify the 6-digit OTP sent to the student's email and create the account.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ahmed@student.com"
 *               code:
 *                 type: string
 *                 description: 6-digit verification code
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Student verified and account created
 *       400:
 *         description: Invalid or expired code
 *       404:
 *         description: Pending registration not found
 *
 * @swagger
 * /api/v1/auth/register/admin:
 *   post:
 *     summary: Register new admin
 *     description: Register an admin account (basic info only)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - phone
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Admin User"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "adminPass123"
 *               phone:
 *                 type: string
 *                 example: "+201000000000"
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *       400:
 *         description: Validation or business logic error
 *       409:
 *         description: Email or phone exists
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return JWT token. Students must verify email before login.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "ahmed@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid credentials or student already logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Logout user and clear authentication session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset code to user's email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "ahmed@example.com"
 *     responses:
 *       200:
 *         description: Reset code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/auth/verify-reset-code:
 *   post:
 *     summary: Verify password reset code
 *     description: Verify the reset code sent to user's email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetCode
 *             properties:
 *               resetCode:
 *                 type: string
 *                 description: 6-digit reset code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Reset code verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid or expired reset code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Reset user password with verified reset code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "ahmed@example.com"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password (minimum 6 characters)
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid request or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
