import asyncHandler from "express-async-handler";
import Course from "../models/courseModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import fs from "fs";
import path from "path";

// Helper function to format course data
const formatCourseData = (course, req) => {
  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;
  const videoBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/videos/`;
  const pdfBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/pdfs/`;

  return {
    _id: course._id,
    name: course.name,
    teacher: course.teacher,
    price: course.price,
    whatsappNumber: course.whatsappNumber,
    followGroup: course.followGroup,
    image: course.image,
    imageUrl: course.image ? imageBaseUrl + course.image : null,
    createdBy: course.createdBy,
    lockedFor: course.lockedFor,
    comments: course.comments.map((comment) => ({
      _id: comment._id,
      message: comment.message,
      createdAt: comment.createdAt,
    })),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    sections: course.sections.map((section) => ({
      _id: section._id,
      title: section.title,
      videos: section.videos.map((video) => ({
        _id: video._id,
        label: video.label,
        filename: video.filename,
        url: videoBaseUrl + video.filename,
      })),
      pdfs: section.pdfs.map((pdf) => ({
        _id: pdf._id,
        label: pdf.label,
        filename: pdf.filename,
        url: pdfBaseUrl + pdf.filename,
        downloadable: pdf.downloadable || false,
      })),
    })),
  };
};

// @desc Create new course (admin only)
export const createCourse = asyncHandler(async (req, res) => {
  const { name, teacher, followGroup, price, whatsappNumber } = req.body;
  const createdBy = req.user._id;

  const course = await Course.create({
    name,
    teacher,
    followGroup,
    price,
    whatsappNumber,
    createdBy,
    image: req.file?.filename || null,
  });

  res.status(201).json({
    message: "Course created successfully",
    course,
  });
});

// @desc Update course (admin only)
export const updateCourse = asyncHandler(async (req, res) => {
  const { courseName, newName, teacher, followGroup, price, whatsappNumber } =
    req.body;

  if (!courseName) {
    return res.status(400).json({ message: "Course name is required" });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Check authorization
  if (
    course.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      message: "Not authorized to update this course",
    });
  }

  // Delete old image if new one is uploaded
  if (req.file && course.image) {
    const oldImagePath = path.join("src", "uploads", "images", course.image);
    fs.unlink(oldImagePath, () => {});
  }

  // Update course fields
  if (newName && newName !== courseName) {
    const existingCourse = await Course.findOne({ name: newName });
    if (existingCourse) {
      return res.status(400).json({ message: "Course name already exists" });
    }
    course.name = newName;
  }

  if (teacher) course.teacher = teacher;
  if (followGroup) course.followGroup = followGroup;
  if (price !== undefined) course.price = price;
  if (whatsappNumber) course.whatsappNumber = whatsappNumber;
  if (req.file) course.image = req.file.filename;

  await course.save();

  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;

  res.status(200).json({
    message: "Course updated successfully",
    course: {
      ...course.toObject(),
      imageUrl: course.image ? imageBaseUrl + course.image : null,
    },
  });
});

// @desc add new Section in Course
export const addSection = asyncHandler(async (req, res) => {
  const { courseName, title, videoLabels, pdfLabels, pdfDownloadable } =
    req.body;

  // Validate required fields
  if (!courseName || !title) {
    return res.status(400).json({
      message: "courseName and title are required",
    });
  }

  // Find course
  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Parse JSON arrays safely
  const videoLabelList = videoLabels ? JSON.parse(videoLabels) : [];
  const pdfLabelList = pdfLabels ? JSON.parse(pdfLabels) : [];
  const pdfDownloadableList = pdfDownloadable
    ? JSON.parse(pdfDownloadable)
    : [];

  // Create new section
  const newSection = {
    title,
    videos: [],
    pdfs: [],
  };

  // Base URLs for file serving
  const videoBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/videos/`;
  const pdfBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/pdfs/`;

  if (req.files) {
    // Handle video files
    if (req.files.videos) {
      req.files.videos.forEach((file, index) => {
        newSection.videos.push({
          label: videoLabelList[index] || file.originalname,
          filename: file.filename,
        });
      });
    }

    // Handle PDF files
    if (req.files.pdfs) {
      req.files.pdfs.forEach((file, index) => {
        const downloadable =
          index < pdfDownloadableList.length
            ? pdfDownloadableList[index] === "true"
            : false;

        newSection.pdfs.push({
          label: pdfLabelList[index] || file.originalname,
          filename: file.filename,
          downloadable,
        });
      });
    }
  }

  // Add section to course and save
  course.sections.push(newSection);
  await course.save();

  // Prepare response
  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;

  const response = {
    message: "Section added successfully",
    course: {
      ...course.toObject(),
      imageUrl: course.image ? imageBaseUrl + course.image : null,
      sections: course.sections.map((section) => ({
        _id: section._id,
        title: section.title,
        videos: section.videos.map((video) => ({
          _id: video._id,
          label: video.label,
          filename: video.filename,
          url: videoBaseUrl + video.filename,
        })),
        pdfs: section.pdfs.map((pdf) => ({
          _id: pdf._id,
          label: pdf.label,
          filename: pdf.filename,
          url: pdfBaseUrl + pdf.filename,
          downloadable: pdf.downloadable,
        })),
      })),
    },
  };

  res.status(200).json(response);
});

// @desc List all courses (public info)
export const listCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find();
  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;
  const videoBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/videos/`;
  const pdfBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/pdfs/`;
  const formattedCourses = courses.map((course) => ({
    _id: course._id,
    name: course.name,
    teacher: course.teacher,
    price: course.price,
    whatsappNumber: course.whatsappNumber,
    image: course.image,
    imageUrl: course.image ? imageBaseUrl + course.image : null,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    sections: course.sections.map((section) => ({
      _id: section._id,
      title: section.title,
      videos: section.videos.map((video) => ({
        _id: video._id,
        label: video.label,
        filename: video.filename,
        url: videoBaseUrl + video.filename,
      })),
      pdfs: section.pdfs.map((pdf) => ({
        _id: pdf._id,
        label: pdf.label,
        filename: pdf.filename,
        url: pdfBaseUrl + pdf.filename,
        downloadable: pdf.downloadable || false,
      })),
    })),
  }));
  res.status(200).json({
    count: courses.length,
    courses: formattedCourses,
  });
});

// @desc Get course detail for student
export const getCourse = asyncHandler(async (req, res) => {
  const { courseName } = req.query;
  if (!courseName) {
    return res.status(400).json({ message: "Course name is required" });
  }
  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }
  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;
  const videoBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/videos/`;
  const pdfBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/pdfs/`;
  const formattedCourse = {
    _id: course._id,
    name: course.name,
    teacher: course.teacher,
    price: course.price,
    whatsappNumber: course.whatsappNumber,
    followGroup: course.followGroup,
    image: course.image,
    imageUrl: course.image ? imageBaseUrl + course.image : null,
    createdBy: course.createdBy,
    lockedFor: course.lockedFor,
    comments: course.comments.map((comment) => ({
      _id: comment._id,
      message: comment.message,
      createdAt: comment.createdAt,
    })),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    sections: course.sections.map((section) => ({
      _id: section._id,
      title: section.title,
      videos: section.videos.map((video) => ({
        _id: video._id,
        label: video.label,
        filename: video.filename,
        url: videoBaseUrl + video.filename,
      })),
      pdfs: section.pdfs.map((pdf) => ({
        _id: pdf._id,
        label: pdf.label,
        filename: pdf.filename,
        url: pdfBaseUrl + pdf.filename,
        downloadable: pdf.downloadable || false,
      })),
    })),
  };
  res.status(200).json(formattedCourse);
});

// @desc Get course by adminID
export const searchCoursesByAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.query;
  if (!adminId)
    return res.status(400).json({ message: "Admin ID is required" });

  const courses = await Course.find({ createdBy: adminId });
  res.json(courses);
});

// @desc Open course for a student (admin only)
export const openCourseForUser = asyncHandler(async (req, res) => {
  const { courseName } = req.body;
  const { emailOrPhone } = req.body;

  const course = await Course.findOne({ name: courseName });
  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  });
  if (!course || !user)
    return res.status(404).json({ message: "Course or user not found" });

  if (!course.lockedFor.includes(user._id)) {
    course.lockedFor.push(user._id);
    await course.save();
  }

  res.json({ message: "Course opened for user" });
});

// @desc List courses opened for current student
export const listUserCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ lockedFor: req.user._id });
  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;
  const videoBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/videos/`;
  const pdfBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/pdfs/`;
  const formattedCourses = courses.map((course) => ({
    _id: course._id,
    name: course.name,
    teacher: course.teacher,
    price: course.price,
    whatsappNumber: course.whatsappNumber,
    image: course.image,
    imageUrl: course.image ? imageBaseUrl + course.image : null,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    sections: course.sections.map((section) => ({
      _id: section._id,
      title: section.title,
      videos: section.videos.map((video) => ({
        _id: video._id,
        label: video.label,
        filename: video.filename,
        url: videoBaseUrl + video.filename,
      })),
      pdfs: section.pdfs.map((pdf) => ({
        _id: pdf._id,
        label: pdf.label,
        filename: pdf.filename,
        url: pdfBaseUrl + pdf.filename,
        downloadable: pdf.downloadable || false,
      })),
    })),
  }));
  res.status(200).json({
    count: courses.length,
    courses: formattedCourses,
  });
});

// @desc Add comment and send notification
export const addComment = asyncHandler(async (req, res) => {
  const { courseName, message } = req.body;

  if (!courseName || !message)
    return res
      .status(400)
      .json({ message: "courseName and message are required" });

  const course = await Course.findOne({ name: courseName });
  if (!course) return res.status(404).json({ message: "Course not found" });

  // أضف التعليق للكورس
  course.comments.push({ message });
  await course.save();

  // أرسل إشعار لكل طالب مشترك (lockedFor)
  const notifications = course.lockedFor.map((userId) => ({
    userId,
    courseName,
    message: `New comment on ${courseName}: ${message}`,
  }));

  await Notification.insertMany(notifications); // حفظ الإشعارات دفعة واحدة

  res.status(200).json({ message: "Comment added and notifications sent" });
});

// @desc delete course
export const deleteCourse = asyncHandler(async (req, res) => {
  const { courseName } = req.body;
  if (!courseName)
    return res.status(400).json({ message: "Course name is required" });

  const course = await Course.findOne({ name: courseName });
  if (!course) return res.status(404).json({ message: "Course not found" });

  // Delete course image
  if (course.image) {
    const imagePath = path.join("src", "uploads", "images", course.image);
    fs.unlink(imagePath, () => {});
  }

  // Delete all files from all sections
  course.sections.forEach((section) => {
    // Delete videos
    section.videos.forEach((video) => {
      if (video.filename) {
        const videoPath = path.join("src", "uploads", "videos", video.filename);
        fs.unlink(videoPath, () => {});
      }
    });

    // Delete PDFs
    section.pdfs.forEach((pdf) => {
      if (pdf.filename) {
        const pdfPath = path.join("src", "uploads", "pdfs", pdf.filename);
        fs.unlink(pdfPath, () => {});
      }
    });
  });

  await course.deleteOne();
  res.status(200).json({ message: "Course deleted successfully" });
});

// @desc Delete section from course (admin only)
export const deleteSection = asyncHandler(async (req, res) => {
  const { courseName, sectionId } = req.body;

  if (!courseName || !sectionId) {
    return res
      .status(400)
      .json({ message: "Course name and section ID are required" });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Check if user is the creator or admin
  if (
    course.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res
      .status(403)
      .json({ message: "Not authorized to modify this course" });
  }

  // Find the section to delete
  const sectionIndex = course.sections.findIndex(
    (section) => section._id.toString() === sectionId
  );
  if (sectionIndex === -1) {
    return res.status(404).json({ message: "Section not found" });
  }

  const sectionToDelete = course.sections[sectionIndex];

  // Delete associated files
  // Delete videos
  sectionToDelete.videos.forEach((video) => {
    if (video.filename) {
      const videoPath = path.join("src", "uploads", "videos", video.filename);
      fs.unlink(videoPath, () => {});
    }
  });

  // Delete PDFs
  sectionToDelete.pdfs.forEach((pdf) => {
    if (pdf.filename) {
      const pdfPath = path.join("src", "uploads", "pdfs", pdf.filename);
      fs.unlink(pdfPath, () => {});
    }
  });

  // Remove the section from the course
  course.sections.splice(sectionIndex, 1);
  await course.save();

  res.status(200).json({
    message: "Section deleted successfully",
    course: course,
  });
});

// @desc Get my notifications
export const getMyNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const notifications = await Notification.find({ userId }).sort({
    createdAt: -1,
  });

  res.json(notifications);
});

// @desc Get students enrolled (unlocked) in a course
export const getStudentsInCourse = asyncHandler(async (req, res) => {
  const { courseName } = req.body;

  if (!courseName) {
    return res.status(400).json({ message: "Course name is required" });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const students = await User.find({
    _id: { $in: course.lockedFor },
    role: "student",
  }).select("-password -__v");

  if (!students.length) {
    return res
      .status(404)
      .json({ message: "No students found for this course" });
  }

  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;

  const formattedStudents = students.map((student) => ({
    _id: student._id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    role: student.role,
    cardImage: student.cardImage || null,
    imageUrl: student.cardImage ? imageBaseUrl + student.cardImage : null,
  }));

  res
    .status(200)
    .json({ count: formattedStudents.length, students: formattedStudents });
});
