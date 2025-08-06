import express from "express";
import { getMyNotifications } from "../controllers/courseController.js";
import { isAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// User Routes
router.get("/", isAuth, getMyNotifications);

export default router;

/**
 * @swagger
 * /api/v1/notification:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieve notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: number
 *                   description: Number of notifications
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Notification ID
 *                       message:
 *                         type: string
 *                         description: Notification message
 *                       type:
 *                         type: string
 *                         description: Notification type
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Creation date
 *                       read:
 *                         type: boolean
 *                         description: Whether notification is read
 *       401:
 *         description: Unauthorized - Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
