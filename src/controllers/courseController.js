import asyncHandler from 'express-async-handler';
import Course from '../models/Course.js';
import User from '../models/User.js';

// Create new course (admin only)
export const createCourse = asyncHandler(async (req, res) => {
  const { name, teacher, sections, followGroup } = req.body;
  const course = await Course.create({ name, teacher, sections, followGroup });
  res.status(201).json(course);
});

// List all courses (public info)
export const listCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find().select('name teacher');
  res.json(courses);
});

// Get course detail for student
export const getCourse = asyncHandler(async (req, res) => {
   const { courseName } = req.query;

  if (!courseName) {
    return res.status(400).json({ message: 'Course name is required' });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) return res.status(404).json({ message: 'Course not found' });

  const isOpen = course.lockedFor.includes(req.user._id);
  if (!isOpen) return res.status(403).json({ message: 'Course is locked' });

  res.status(200).json(course);;
});

// Open course for a student (admin only)
export const openCourseForUser = asyncHandler(async (req, res) => {
  const { courseName } = req.body;
  const { emailOrPhone } = req.body;

  const course = await Course.findOne({ name: courseName });
  const user = await User.findOne({ $or: [{ email: emailOrPhone }, { phone: emailOrPhone }] });
  if (!course || !user) return res.status(404).json({ message: 'Course or user not found' });

  if (!course.lockedFor.includes(user._id)) {
    course.lockedFor.push(user._id);
    await course.save();
  }

  res.json({ message: 'Course opened for user' });
});

// List courses opened for current student
export const listUserCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ lockedFor: req.user._id }).select('name teacher');
  res.json(courses);
});

// Add comment (admin only)
export const addComment = asyncHandler(async (req, res) => {
   const { courseName, message } = req.body;

  if (!courseName || !message) {
    return res.status(400).json({ message: 'courseName and message are required' });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) return res.status(404).json({ message: 'Course not found' });

  course.comments.push({ message });
  await course.save();

  res.status(200).json({ message: 'Comment added', comments: course.comments });
});