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
import { uploadVideosAndPdfs } from "../middlewares/uploadVideoMiddleware.js";

const router = express.Router();

// Admin Routes
router.get("/getAllCourses", listCourses);
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
  addSection
);
router.delete("/delete", isAuth, isAdmin, deleteCourse);
router.delete("/delete/section", isAuth, isAdmin, deleteSection);
router.post("/students-in-course", isAuth, isAdmin, getStudentsInCourse);

// Student Routes
router.get("/me", isAuth, listUserCourses);
router.get("/Course", getCourse);

export default router;

/**
 * @swagger
 * /api/v1/course/getAllCourses:
 *   get:
 *     summary: Get all courses
 *     description: Retrieve list of all available courses (public access)
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: List of courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: number
 *                   description: Number of courses
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Course'
 */

/**
 * @swagger
 * /api/v1/course/create:
 *   post:
 *     summary: Create new course (Admin only)
 *     description: Create a new course with basic information and optional image
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - teacher
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 description: Course name
 *                 example: "Advanced Programming Course"
 *               teacher:
 *                 type: string
 *                 description: Teacher name
 *                 example: "Dr. Ahmed Mohamed"
 *               price:
 *                 type: number
 *                 description: Course price
 *                 example: 500
 *               followGroup:
 *                 type: string
 *                 description: Follow-up group link
 *                 example: "https://t.me/programming_group"
 *               whatsappNumber:
 *                 type: string
 *                 description: WhatsApp contact number
 *                 example: "+201234567890"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Course cover image
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Course'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/update:
 *   put:
 *     summary: Update course (Admin only)
 *     description: Update existing course information
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: Course ID to update
 *                 example: "64f8b2c1e4b0f4a2c8d1e5f6"
 *               name:
 *                 type: string
 *                 description: Course name
 *                 example: "Advanced Programming Course"
 *               teacher:
 *                 type: string
 *                 description: Teacher name
 *                 example: "Dr. Ahmed Mohamed"
 *               price:
 *                 type: number
 *                 description: Course price
 *                 example: 500
 *               followGroup:
 *                 type: string
 *                 description: Follow-up group link
 *                 example: "https://t.me/programming_group"
 *               whatsappNumber:
 *                 type: string
 *                 description: WhatsApp contact number
 *                 example: "+201234567890"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Course cover image
 *     responses:
 *       200:
 *         description: Course updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Course'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/search/AdminID:
 *   get:
 *     summary: Search courses by admin (Admin only)
 *     description: Search courses created by the authenticated admin
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: number
 *                   description: Number of courses
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Course'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/openCourse:
 *   post:
 *     summary: Open course for user (Admin only)
 *     description: Grant a student access to a specific course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - studentId
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: Course ID
 *                 example: "64f8b2c1e4b0f4a2c8d1e5f6"
 *               studentId:
 *                 type: string
 *                 description: Student user ID
 *                 example: "64f8b2c1e4b0f4a2c8d1e5f7"
 *     responses:
 *       200:
 *         description: Course access granted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Course or student not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/add/comments:
 *   post:
 *     summary: Add comment to course (Admin only)
 *     description: Add a comment or note to a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - comment
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: Course ID
 *                 example: "64f8b2c1e4b0f4a2c8d1e5f6"
 *               comment:
 *                 type: string
 *                 description: Comment text
 *                 example: "Great progress in this course"
 *     responses:
 *       200:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/add/section:
 *   post:
 *     summary: Add section to course (Admin only)
 *     description: Add a new section with videos and PDFs to an existing course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - sectionTitle
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: Course ID to add section to
 *                 example: "64f8b2c1e4b0f4a2c8d1e5f6"
 *               sectionTitle:
 *                 type: string
 *                 description: Section title
 *                 example: "Lesson 1 - Introduction"
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Video files (will be compressed to 720p)
 *               pdfs:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: PDF files
 *               videoLabels:
 *                 type: string
 *                 description: Comma-separated video labels
 *                 example: "Introduction Video,Main Content"
 *               pdfLabels:
 *                 type: string
 *                 description: Comma-separated PDF labels
 *                 example: "Course Notes,Exercise Sheet"
 *               pdfDownloadable:
 *                 type: string
 *                 description: Comma-separated boolean values for PDF downloadability
 *                 example: "true,false"
 *     responses:
 *       201:
 *         description: Section added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Course'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/delete:
 *   delete:
 *     summary: Delete course (Admin only)
 *     description: Delete a course and all its associated files
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: Course ID to delete
 *                 example: "64f8b2c1e4b0f4a2c8d1e5f6"
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/delete/section:
 *   delete:
 *     summary: Delete section (Admin only)
 *     description: Delete a section and all its associated files from a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - sectionId
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: Course ID
 *                 example: "64f8b2c1e4b0f4a2c8d1e5f6"
 *               sectionId:
 *                 type: string
 *                 description: Section ID to delete
 *                 example: "64f8b2c1e4b0f4a2c8d1e5f8"
 *     responses:
 *       200:
 *         description: Section deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Course or section not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/students-in-course:
 *   post:
 *     summary: Get students in course (Admin only)
 *     description: Get list of students enrolled in a specific course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: Course ID
 *                 example: "64f8b2c1e4b0f4a2c8d1e5f6"
 *     responses:
 *       200:
 *         description: Students list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: number
 *                   description: Number of students
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/me:
 *   get:
 *     summary: Get user's courses
 *     description: Get list of courses accessible to the authenticated user
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: number
 *                   description: Number of courses
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Course'
 *       401:
 *         description: Unauthorized - Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/Course:
 *   get:
 *     summary: Get specific course
 *     description: Get details of a specific course by ID (query parameter)
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *         example: "64f8b2c1e4b0f4a2c8d1e5f6"
 *     responses:
 *       200:
 *         description: Course details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Course'
 *       404:
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
