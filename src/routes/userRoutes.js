import express from "express";
import { isAuth } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/roleMiddleware.js";
import {
  searchUser,
  deleteUser,
  getAllStudents,
  updateFCMToken,
} from "../controllers/userController.js";

const router = express.Router();

// Admin Routes
router.get("/search", isAuth, isAdmin, searchUser);
router.delete("/delete", isAuth, isAdmin, deleteUser);
router.get("/students", isAuth, isAdmin, getAllStudents);

// Student Routes
router.put("/fcm-token", isAuth, updateFCMToken);

export default router;

/**
 * @swagger
 * /api/v1/user/search:
 *   get:
 *     summary: Search users (Admin only)
 *     description: Search for users by email or other criteria
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
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/user/delete:
 *   delete:
 *     summary: Delete user (Admin only)
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
 *         description: Access denied - Admin only
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
 *     summary: Get all students (Admin only)
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
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
