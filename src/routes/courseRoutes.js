import express from 'express';
import {
  createCourse,
  listCourses,
  searchCoursesByAdmin,
  getCourse,
  openCourseForUser,
  listUserCourses,
  addComment,
  addSection,
  deleteCourse,
  getStudentsInCourse
} from '../controllers/courseController.js';
import { isAuth } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';
import { uploadPdfs } from '../middlewares/uploadPdfMiddleware.js';
import { uploadImage} from '../middlewares/uploadImagesMiddleware.js';


const router = express.Router();

// Public
router.get('/getAllCourses', listCourses);

// Admin only
router.post('/create', isAuth, isAdmin,uploadImage.single("image"), createCourse);
router.get('/search/AdminID',   isAuth, isAdmin, searchCoursesByAdmin);
router.post('/openCourse', isAuth, isAdmin, openCourseForUser);
router.post('/add/comments', isAuth, isAdmin, addComment);
router.post('/add/section', isAuth, isAdmin, uploadPdfs.array('pdfs'), addSection);
router.delete('/delete',isAuth, isAdmin, deleteCourse);
router.post('/students-in-course', isAuth ,isAdmin , getStudentsInCourse);


// Student
router.get('/me', isAuth, listUserCourses);
router.get('/Course', isAuth, getCourse);

export default router;