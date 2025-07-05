import User from "../models/userModel.js";
import asyncHandler from "express-async-handler";
import fs from "fs";
import path from "path";

// @desc search User by mail or phone
export const searchUser = asyncHandler(async (req, res) => {
  const { emailOrPhone } = req.body;
  if (!emailOrPhone)
    return res.status(400).json({ message: "User Email Or Phone is required" });

  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  }).select("-password -__v");

  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({ user });
});

// @desc delete User by mail or phone
export const deleteUser = asyncHandler(async (req, res) => {
  const { emailOrPhone } = req.body;

  if (!emailOrPhone)
    return res.status(400).json({ message: "User Email Or Phone is required" });

  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  });
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.cardImage) {
    const imagePath = path.join("src/uploads/images", user.cardImage);
    fs.unlink(imagePath, (err) => {
      if (err) console.error("Failed to delete image:", err.message);
    });
  }

  await user.deleteOne();

  res.status(200).json({ message: "User deleted successfully" });
});

// @desc get All Users
export const getAllStudents = asyncHandler(async (req, res) => {
  const students = await User.find({ role: 'student' }).select('-password -__v');

  if (!students || students.length === 0) {
    return res.status(404).json({ message: 'No students found' });
  }

  res.status(200).json({ count: students.length, students });
});