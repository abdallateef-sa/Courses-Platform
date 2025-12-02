import express from "express";
import { getMyNotifications } from "../controllers/courseController.js";
import { isAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// User Routes
router.get("/", isAuth, getMyNotifications);

export default router;

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieve notifications for the authenticated user. Includes course-related notifications only for published courses the user is enrolled in, plus direct user-targeted notifications.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: Notification ID
 *                   message:
 *                     type: string
 *                     description: Notification message
 *                   courseName:
 *                     type: string
 *                     description: Related course name (if any)
 *                   userId:
 *                     type: string
 *                     description: Target user ID (for direct notifications)
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: Creation date
 *                   read:
 *                     type: boolean
 *                     description: Whether notification is read
 *       401:
 *         description: Unauthorized - Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
