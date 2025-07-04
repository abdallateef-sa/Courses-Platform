import express from 'express';
import { isAuth } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';
import { searchUser , deleteUser } from '../controllers/userController.js';

const router = express.Router();

router.get('/search', isAuth, isAdmin, searchUser);
router.delete('/delete', isAuth, isAdmin, deleteUser);

export default router;