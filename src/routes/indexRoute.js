import { Router } from "express";
import authRoute from "./authRoute.js";
import userRoutes from "./userRoutes.js";
import courseRoutes from "./courseRoutes.js";


const router = Router();

router.use("/auth" ,authRoute);
router.use("/search-user" ,userRoutes);
router.use("/course" ,courseRoutes);

export default router;