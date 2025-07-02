import express from 'express';
import { isAuth } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';
import { searchUser } from '../controllers/userController.js';

const router = express.Router();

router.get('/', isAuth, isAdmin, searchUser);

export default router;