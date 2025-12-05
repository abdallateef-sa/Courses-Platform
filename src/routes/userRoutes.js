import express from "express";
import { isAuth } from "../middlewares/authMiddleware.js";
import { isAdmin, isSuperadmin } from "../middlewares/roleMiddleware.js";
import {
  searchUser,
  deleteUser,
  getAllStudents,
  updateFCMToken,
  getMyProfile,
  requestDeleteAccount,
  confirmDeleteAccount,
  getAllAdmins,
  resendDeleteAccountOtp,
} from "../controllers/userController.js";

const router = express.Router();

// Admin Routes
router.get("/search", isAuth, isAdmin, searchUser);
router.delete("/delete", isAuth, isAdmin, deleteUser);
router.get("/students", isAuth, isAdmin, getAllStudents);
// Superadmin Routes
router.get("/admins", isAuth, isSuperadmin, getAllAdmins);

// Student Routes
router.put("/fcm-token", isAuth, updateFCMToken);
router.get("/me", isAuth, getMyProfile);
router.post("/delete-account/request", isAuth, requestDeleteAccount);
router.post("/delete-account/confirm", isAuth, confirmDeleteAccount);
router.post("/delete-account/resend", isAuth, resendDeleteAccountOtp);

export default router;

/**
 * @swagger
 * /api/v1/user/me:
 *   get:
 *     summary: Get my profile
 *     description: Returns the authenticated user's profile, including `imageUrl` if card image exists.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized - Invalid token
 */

/**
 * @swagger
 * /api/v1/user/delete-account/resend:
 *   post:
 *     summary: Resend deletion OTP
 *     description: Regenerates and resends the deletion OTP to the authenticated user's email. Throttled to once per 60 seconds.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OTP resent to email
 *       404:
 *         description: No pending deletion request found
 *       429:
 *         description: Too many requests - Please wait before requesting another code
 */

/**
 * @swagger
 * /api/v1/user/admins:
 *   get:
 *     summary: Get all admins (Superadmin only)
 *     description: Superadmin can retrieve all admins with full profile fields (excluding password).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admins list retrieved successfully
 *       403:
 *         description: Access denied - Requires superadmin
 *       404:
 *         description: No admins found
 */

/**
 * @swagger
 * /api/v1/user/fcm-token:
 *   put:
 *     summary: Update FCM token
 *     description: Store/update the user's Firebase Cloud Messaging token used for push notifications.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fcmToken]
 *             properties:
 *               fcmToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: FCM token updated successfully
 *       400:
 *         description: FCM token is required
 *       401:
 *         description: Unauthorized - Invalid token
 */

/**
 * @swagger
 * /api/v1/user/delete-account/request:
 *   post:
 *     summary: Request account deletion (OTP)
 *     description: Sends a 6-digit OTP to the authenticated user's email to confirm account deletion. OTP expires in 10 minutes.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       400:
 *         description: Valid email required to delete account
 *       401:
 *         description: Unauthorized - Invalid token
 */

/**
 * @swagger
 * /api/v1/user/delete-account/confirm:
 *   post:
 *     summary: Confirm account deletion
 *     description: Verify OTP and permanently delete the authenticated user's account. Also removes user artifacts and notifications.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Invalid or expired OTP
 *       401:
 *         description: Unauthorized - Invalid token
 *
 * @swagger
 * /api/v1/user/search:
 *   get:
 *     summary: Search users (Admin/Superadmin)
 *     description: Search for users by email or other criteria. Inactive admins are blocked.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: User email to search for
 *         example: "student@example.com"
 *       - in: query
 *         name: fullName
 *         schema:
 *           type: string
 *         description: User full name to search for
 *         example: "Ahmed Mohamed"
 *     responses:
 *       200:
 *         description: User search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: number
 *                   description: Number of users found
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/user/delete:
 *   delete:
 *     summary: Delete user (Admin/Superadmin)
 *     description: Delete a user account permanently
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to delete
 *                 example: "64f8b2c1e4b0f4a2c8d1e5f6"
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/user/students:
 *   get:
 *     summary: Get all students (Admin/Superadmin)
 *     description: Retrieve list of all student users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Students list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: number
 *                   description: Number of students
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
