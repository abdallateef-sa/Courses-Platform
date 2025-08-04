import express from "express";
import {
  createCourse,
  updateCourse,
  listCourses,
  searchCoursesByAdmin,
  getCourse,
  openCourseForUser,
  listUserCourses,
  addComment,
  addSection,
  deleteCourse,
  deleteSection,
  getStudentsInCourse,
} from "../controllers/courseController.js";
import { isAuth } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/roleMiddleware.js";
import { uploadPdfs } from "../middlewares/uploadPdfMiddleware.js";
import { uploadImage } from "../middlewares/uploadImagesMiddleware.js";
import {
  uploadVideosAndPdfs,
  compressVideosMiddleware,
} from "../middlewares/uploadVideoMiddleware.js";

const router = express.Router();

// Public
router.get("/getAllCourses", listCourses);

// Admin only
router.post(
  "/create",
  isAuth,
  isAdmin,
  uploadImage.single("image"),
  createCourse
);
router.put(
  "/update",
  isAuth,
  isAdmin,
  uploadImage.single("image"),
  updateCourse
);
router.get("/search/AdminID", isAuth, isAdmin, searchCoursesByAdmin);
router.post("/openCourse", isAuth, isAdmin, openCourseForUser);
router.post("/add/comments", isAuth, isAdmin, addComment);
router.post(
  "/add/section",
  isAuth,
  isAdmin,
  uploadVideosAndPdfs.fields([
    { name: "videos", maxCount: 10 },
    { name: "pdfs", maxCount: 10 },
  ]),
  compressVideosMiddleware,
  addSection
);
router.delete("/delete", isAuth, isAdmin, deleteCourse);
router.delete("/delete/section", isAuth, isAdmin, deleteSection);
router.post("/students-in-course", isAuth, isAdmin, getStudentsInCourse);

// Student
router.get("/me", isAuth, listUserCourses);
router.get("/Course", getCourse);

export default router;
