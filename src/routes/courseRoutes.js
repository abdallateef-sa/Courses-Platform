import express from "express";
import {
  createCourse,
  updateCourse,
  listCourses,
  listCoursesForStudent,
  searchCoursesByAdmin,
  getCourse,
  getCourseAdmin,
  openCourseForUser,
  listUserCourses,
  setCourseStatus,
  addCourseNote,
  deleteCourseNote,
  addSection,
  deleteCourse,
  deleteSection,
  getStudentsInCourse,
  removeStudentFromCourse,
  streamVideo,
  updateSection,
  deleteVideoFromSection,
  deletePdfFromSection,
} from "../controllers/courseController.js";
import { isAuth } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/roleMiddleware.js";
import { uploadPdfs } from "../middlewares/uploadPdfMiddleware.js";
import { uploadImage } from "../middlewares/uploadImagesMiddleware.js";
import { uploadVideosAndPdfs } from "../middlewares/uploadVideoMiddleware.js";

const router = express.Router();

// Admin Routes
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
router.get("/getAllCourses/Admin", isAuth, isAdmin, listCourses);
router.get("/Course/Admin", isAuth, isAdmin, getCourseAdmin);
router.get("/search/AdminID", isAuth, isAdmin, searchCoursesByAdmin);
router.post("/openCourse", isAuth, isAdmin, openCourseForUser);
router.delete("/remove-student", isAuth, isAdmin, removeStudentFromCourse);
router.post("/set-status", isAuth, isAdmin, setCourseStatus);
router.post("/add/note", isAuth, isAdmin, addCourseNote);
router.delete("/delete/note", isAuth, isAdmin, deleteCourseNote);
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

// Update a section's basic fields (title/isFree)
router.put(
  "/update/section",
  isAuth,
  isAdmin,
  uploadVideosAndPdfs.fields([
    { name: "videos", maxCount: 10 },
    { name: "pdfs", maxCount: 10 },
  ]),
  updateSection
);

// Delete a specific video from a section
router.delete("/delete/section/video", isAuth, isAdmin, deleteVideoFromSection);

// Delete a specific PDF from a section
router.delete("/delete/section/pdf", isAuth, isAdmin, deletePdfFromSection);

// Student Routes
router.get("/getAllCourses", listCoursesForStudent);
router.get("/me", isAuth, listUserCourses);
router.get("/Course", getCourse);

// Video streaming with HTTP Range (Partial Content 206)
router.get("/uploads/videos/:filename", isAuth, streamVideo);

export default router;

/**
 * @swagger
 * /api/v1/course/getAllCourses:
 *   get:
 *     summary: Get all published courses (Student)
 *     description: Retrieve list of published courses only (hidden when unpublished).
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
 * /api/v1/course/getAllCourses/Admin:
 *   get:
 *     summary: Get all courses (Admin/Superadmin)
 *     description: Admin and superadmin can view all courses regardless of published status. Inactive admins are blocked.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
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
 *       403:
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/create:
 *   post:
 *     summary: Create new course (Admin/Superadmin)
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
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/update:
 *   put:
 *     summary: Update course (Admin/Superadmin)
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
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
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
 *     summary: Search courses by admin (Admin/Superadmin)
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
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/course/openCourse:
 *   post:
 *     summary: Open course for user (Admin/Superadmin)
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
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
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
 * /api/v1/course/remove-student:
 *   delete:
 *     summary: Remove a student from a course (Admin/Superadmin)
 *     description: Unenroll a student from a specific course by email or phone.
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
 *               - courseName
 *               - emailOrPhone
 *             properties:
 *               courseName:
 *                 type: string
 *                 description: Course name
 *                 example: "Advanced Programming Course"
 *               emailOrPhone:
 *                 type: string
 *                 description: Student email or phone
 *                 example: "+201234567890"
 *     responses:
 *       200:
 *         description: Student removed from course
 *       403:
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
 *       404:
 *         description: Course or student not found, or student not enrolled
 */

/**
 * @swagger
 * /api/v1/course/add/note:
 *   post:
 *     summary: Add a note to course (Admin/Superadmin)
 *     description: Adds a note and sends notifications to enrolled students.
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
 *               - courseName
 *               - note
 *             properties:
 *               courseName:
 *                 type: string
 *                 description: Course name
 *                 example: "Advanced Programming Course"
 *               note:
 *                 type: string
 *                 description: Note text to add and notify students with
 *                 example: "New assignment uploaded in Unit 2"
 *     responses:
 *       200:
 *         description: Note added and notifications sent
 *       403:
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
 *       404:
 *         description: Course not found
 */

/**
 * @swagger
 * /api/v1/course/add/section:
 *   post:
 *     summary: Add section to course (Admin/Superadmin)
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
 *               isFree:
 *                 type: boolean
 *                 description: Whether the section is free to access
 *                 example: false
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
 *               pdfFolders:
 *                 type: string
 *                 description: JSON array of folder names mapped to each PDF (e.g. ["Week1","Week1"]). If provided, must match pdfs length.
 *                 example: "[\"Week1\",\"Week1\"]"
 *               pdfFolder:
 *                 type: string
 *                 description: Single folder name applied to all uploaded PDFs (used when not sending pdfFolders array)
 *                 example: "Week1"
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
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
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
 *     summary: Delete course (Admin/Superadmin)
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
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
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
 *     summary: Delete section (Admin/Superadmin)
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
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
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
 *     summary: Get students in course (Admin/Superadmin)
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
 *         description: Access denied - Requires admin or superadmin (or admin deactivated)
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
 *     summary: Get specific course (Published only)
 *     description: Get course details by name. Only published courses are returned for public/student access.
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
/**
 * @swagger
 * /api/v1/course/Course/Admin:
 *   get:
 *     summary: Get specific course (Admin only)
 *     description: Admin can view course details regardless of published status.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseName
 *         required: true
 *         schema:
 *           type: string
 *         description: Course name
 *         example: "Advanced Programming Course"
 *     responses:
 *       200:
 *         description: Course details retrieved successfully
 *       403:
 *         description: Access denied - Admin only
 *       404:
 *         description: Course not found
 */
