import { Router } from "express";
import authRoute from "./authRoute.js";
import userRoutes from "./userRoutes.js";
import courseRoutes from "./courseRoutes.js";
import notificationRoute from "./notificationRoute.js";


const router = Router();

router.use("/auth" ,authRoute);
router.use("/user" ,userRoutes);
router.use("/course" ,courseRoutes);
router.use("/notifications" ,notificationRoute);

export default router;