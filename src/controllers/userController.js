import User from "../models/userModel.js";
import asyncHandler from "express-async-handler";
import fs from "fs";
import path from "path";
import Course from "../models/courseModel.js";
import Notification from "../models/notificationModel.js";
import DeletionRequest from "../models/deletionRequestModel.js";
import sendMail from "../utils/sendMail.js";

// @desc search User by mail or phone
export const searchUser = asyncHandler(async (req, res) => {
  const { emailOrPhone } = req.body;
  if (!emailOrPhone)
    return res.status(400).json({ message: "User Email Or Phone is required" });

  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  }).select("-password -__v");

  if (!user) return res.status(404).json({ message: "User not found" });

  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;

  const userObj = user.toObject();
  if (userObj.cardImage) userObj.cardImage = imageBaseUrl + userObj.cardImage;

  res.status(200).json({ user: userObj });
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
  const students = await User.find({ role: "student" }).select(
    "-password -__v"
  );

  if (!students || students.length === 0) {
    return res.status(404).json({ message: "No students found" });
  }

  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;

  const formattedStudents = students.map((student) => {
    const studentObj = student.toObject();
    if (studentObj.cardImage)
      studentObj.cardImage = imageBaseUrl + studentObj.cardImage;
    return studentObj;
  });

  res
    .status(200)
    .json({ count: formattedStudents.length, students: formattedStudents });
});

// @desc Get All Admins (Superadmin only)
export const getAllAdmins = asyncHandler(async (req, res) => {
  const admins = await User.find({ role: "admin" }).select("-password -__v");

  if (!admins || admins.length === 0) {
    return res.status(404).json({ message: "No admins found" });
  }

  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;

  const formatted = admins.map((admin) => {
    const obj = admin.toObject();
    if (obj.cardImage) obj.cardImage = imageBaseUrl + obj.cardImage;
    return obj;
  });

  res.status(200).json({ count: formatted.length, admins: formatted });
});

// @desc Update FCM Token for push notifications
export const updateFCMToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;
  const userId = req.user._id;

  if (!fcmToken) {
    return res.status(400).json({ message: "FCM token is required" });
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { fcmToken },
    { new: true }
  ).select("-password -__v");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    message: "FCM token updated successfully",
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      fcmToken: user.fcmToken,
      fcmTokenUpdated: true,
    },
  });
});

// @desc Get my profile (authenticated user)
export const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -__v");
  if (!user) return res.status(404).json({ message: "User not found" });

  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;
  const userObj = user.toObject();
  userObj.imageUrl = userObj.cardImage
    ? imageBaseUrl + userObj.cardImage
    : null;

  res.status(200).json(userObj);
});

// Helpers for OTP
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// @desc Request account deletion (send OTP to email)
export const requestDeleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("email name fullName");
  if (!user || !user.email) {
    return res
      .status(400)
      .json({ message: "Valid email required to delete account" });
  }

  const otp = generateOtp();
  // Remove previous requests and store a fresh one with TTL
  await DeletionRequest.deleteMany({ userId: user._id });
  await DeletionRequest.create({
    userId: user._id,
    email: user.email,
    otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  // Send OTP email
  await sendMail({
    email: user.email,
    subject: "Confirm Account Deletion",
    text: `Your OTP to confirm deletion is: ${otp}`,
    html: `<p>Your OTP to confirm deletion is: <strong>${otp}</strong></p>`,
  });

  res.status(200).json({ message: "OTP sent to email" });
});

// @desc Confirm account deletion (verify OTP and delete)
export const confirmDeleteAccount = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ message: "OTP is required" });

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const pending = await DeletionRequest.findOne({ userId: user._id, otp });
  if (
    !pending ||
    (pending.expiresAt && pending.expiresAt.getTime() < Date.now())
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // Clean up user artifacts
  if (user.cardImage) {
    const imagePath = path.join("src", "uploads", "images", user.cardImage);
    fs.unlink(imagePath, () => {});
  }

  // Remove user from any course lockedFor
  await Course.updateMany(
    { lockedFor: user._id },
    { $pull: { lockedFor: user._id } }
  );
  // Delete notifications targeting this user
  await Notification.deleteMany({ userId: user._id });

  // Delete user
  await user.deleteOne();
  // Cleanup the deletion requests for this user
  await DeletionRequest.deleteMany({ userId: req.user._id });

  res.status(200).json({ message: "Account deleted successfully" });
});

// @desc Resend OTP for account deletion
export const resendDeleteAccountOtp = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("email fullName");
  if (!user || !user.email) {
    return res
      .status(400)
      .json({ message: "Valid email required to resend deletion OTP" });
  }

  const pending = await DeletionRequest.findOne({ userId: user._id });
  if (!pending) {
    return res
      .status(404)
      .json({ message: "No pending deletion request found" });
  }

  const now = Date.now();
  if (
    pending.lastResendAt &&
    now - new Date(pending.lastResendAt).getTime() < 60 * 1000
  ) {
    return res
      .status(429)
      .json({ message: "Please wait before requesting another code" });
  }

  const otp = generateOtp();
  pending.otp = otp;
  pending.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  pending.lastResendAt = new Date();
  await pending.save();

  await sendMail({
    email: user.email,
    subject: "Confirm Account Deletion (Resend)",
    text: `Your OTP to confirm deletion is: ${otp}`,
    html: `<p>Your OTP to confirm deletion is: <strong>${otp}</strong></p>`,
  });

  res.status(200).json({ message: "OTP resent to email" });
});
