import express from 'express';
import {
  createCourse,
  listCourses,
  getCourse,
  openCourseForUser,
  listUserCourses,
  addComment
} from '../controllers/courseController.js';
import { isAuth } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Public
router.get('/getAllCourses', listCourses);

// Admin only
router.post('/create', isAuth, isAdmin, createCourse);
router.post('/openCourse', isAuth, isAdmin, openCourseForUser);
router.post('/comments', isAuth, isAdmin, addComment);

// Student
router.get('/me', isAuth, listUserCourses);
router.get('/getCourse', isAuth, getCourse);

export default router;