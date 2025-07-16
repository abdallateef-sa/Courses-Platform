import asyncHandler from "express-async-handler";
import Course from "../models/courseModel.js";
import User from "../models/userModel.js";
import fs from 'fs';
import path from 'path';

// @desc Create new course (admin only)
export const createCourse = asyncHandler(async (req, res) => {
  const { name, teacher, sections, followGroup, price } = req.body;
  const createdBy = req.user._id;

  let parsedSections = [];
  if (sections) {
    try {
      parsedSections = JSON.parse(sections);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid sections format' });
    }
  }

  const course = await Course.create({
    name,
    teacher,
    sections: parsedSections,
    followGroup,
    price,
    createdBy,
    image: req.file?.filename || null
  });

  res.status(201).json(course);
});


// @desc add new Section in Course
export const addSection = asyncHandler(async (req, res) => {
  const { courseName, title, videos } = req.body;
  if (!courseName || !title) {
    return res.status(400).json({ message: 'courseName and title are required' });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: 'Course not found' });
  }

  const newSection = {
    title,
    videos: videos ? JSON.parse(videos) : [],
    pdfs: []
  };

  const fileBaseUrl = `${req.protocol}://${req.get('host')}/uploads/`; //  http://localhost:5000/uploads/

  if (req.files) {
    req.files.forEach(file => {
      newSection.pdfs.push({
        label: file.originalname,
        filename: file.filename,
        url: fileBaseUrl + file.filename
      });
    });
  }

  course.sections.push(newSection);
  await course.save();

  const courseImageUrl = course.image ? fileBaseUrl + course.image : null;

  res.json({
  message: 'Section added',
  course: {
    ...course.toObject(),
    imageUrl: fileBaseUrl + course.image,
    sections: course.sections.map(section => ({
      _id: section._id,
      title: section.title,
      videos: section.videos,
      pdfs: section.pdfs.map(pdf => ({
        _id: pdf._id,
        label: pdf.label,
        filename: pdf.filename,
        url: fileBaseUrl + pdf.filename
      }))
    }))
  }
});

});

// @desc add new Section in Course

// export const addSection = asyncHandler(async (req, res) => {
//   const { courseName, title, videos } = req.body;
//   if (!courseName || !title) return res.status(400).json({ message: 'courseName and title are required' });

//   const course = await Course.findOne({ name: courseName });
//   if (!course) return res.status(404).json({ message: 'Course not found' });

//   const newSection = {
//     title,
//     videos: videos ? JSON.parse(videos) : [],
//     pdfs: []
//   };

//   if (req.files) {
//     req.files.forEach(file => {
//       newSection.pdfs.push({
//         label: file.originalname,
//         filename: file.filename
//       });
//     });
//   }

//   course.sections.push(newSection);
//   await course.save();
//   res.json({ message: 'Section added', course });
// });

// @desc List all courses (public info)

export const listCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find();

  const fileBaseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

  const formattedCourses = courses.map(course => ({
    _id: course._id,
    name: course.name,
    teacher: course.teacher,
    price: course.price,
    image: course.image,
    imageUrl: course.image ? fileBaseUrl + course.image : null,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt
  }));

  res.json(formattedCourses);
});


// export const listCourses = asyncHandler(async (req, res) => {
//   const courses = await Course.find().select();
//   res.json(courses);
// });

// @desc Get course detail for student
export const getCourse = asyncHandler(async (req, res) => {
  const { courseName } = req.query;

  if (!courseName) {
    return res.status(400).json({ message: "Course name is required" });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) return res.status(404).json({ message: "Course not found" });

  const isAdmin = req.user.role === 'admin';
  const isOpen = course.lockedFor.includes(req.user._id);

  if (!isAdmin && !isOpen) {
    return res.status(403).json({ message: "Course is locked" });
  }

  res.status(200).json(course);
});

// @desc Get course by adminID
export const searchCoursesByAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.query;
  if (!adminId) return res.status(400).json({ message: 'Admin ID is required' });

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
  const courses = await Course.find({ lockedFor: req.user._id }).select();
  res.json(courses);
});

// @desc Add comment (admin only)
export const addComment = asyncHandler(async (req, res) => {
  const { courseName, message } = req.body;

  if (!courseName || !message) {
    return res
      .status(400)
      .json({ message: "courseName and message are required" });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) return res.status(404).json({ message: "Course not found" });

  course.comments.push({ message });
  await course.save();

  res.status(200).json({ message: "Comment added", comments: course.comments });
});

// @desc delete course
export const deleteCourse = asyncHandler(async (req, res) => {
  const { courseName } = req.body;
  if (!courseName) return res.status(400).json({ message: 'Course name is required' });

  const course = await Course.findOne({ name: courseName });
  if (!course) return res.status(404).json({ message: 'Course not found' });

  if (course.image) {
    const imagePath = path.join('src', 'uploads', 'images', course.image);
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error(`Error deleting image: ${err.message}`);
      } else {
        console.log('Course image deleted');
      }
    });
  }

  await course.deleteOne();
  res.status(200).json({ message: 'Course deleted successfully' });
});