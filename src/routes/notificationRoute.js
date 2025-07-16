import express from "express";
import { getMyNotifications } from "../controllers/courseController.js"; // أو اعزله في notificationController
import { isAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get("/", isAuth, getMyNotifications);

export default router;
