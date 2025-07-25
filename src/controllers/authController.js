import asyncHandler from "express-async-handler";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import generateJWT from "../utils/generateJWT.js";
import sendMail from "../utils/sendMail.js";
import { rateLimitMap } from "../middlewares/loginLimiter.js";

// @desc Register new student or admin
export const register = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    phone,
    password,
    year,
    departmentType,
    university,
    role,
  } = req.body;

  const userRole = role || "student";
  const normalizedEmail = email.toLowerCase(); //  lowercase

  if (userRole === "student" && !req.file) {
    return res
      .status(400)
      .json({ message: "Card image is required for students" });
  }

  const exists = await User.findOne({
    $or: [{ email: normalizedEmail }, { phone }],
  });
  if (exists) {
    if (req.file) {
      const imagePath = path.join("src/uploads/images", req.file.filename);
      fs.existsSync(imagePath) && fs.unlinkSync(imagePath);
    }
    return res.status(409).json({ message: "Email or phone exists" });
  }

  if (!password || password.trim().length < 6) {
    if (req.file) {
      const imagePath = path.join("src/uploads/images", req.file.filename);
      fs.existsSync(imagePath) && fs.unlinkSync(imagePath);
    }
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  const hashedPassword = await bcrypt.hash(password.trim(), 10);

  const newUser = await User.create({
    fullName,
    email: normalizedEmail,
    phone,
    password: hashedPassword,
    year,
    departmentType,
    university,
    cardImage: req.file?.filename || null,
    role: userRole,
  });

  const token = generateJWT({ id: newUser._id, role: newUser.role });

  res.status(201).json({
    token,
    user: {
      id: newUser._id,
      fullName,
      email: normalizedEmail,
      phone,
      role: newUser.role,
    },
  });
});

// @desc Login student or admin
// export const login = asyncHandler(async (req, res) => {
//   const { emailOrPhone, password } = req.body;

//   const normalizedInput = emailOrPhone.includes("@")
//     ? emailOrPhone.toLowerCase()
//     : emailOrPhone;

//   const user = await User.findOne({
//     $or: [{ email: normalizedInput }, { phone: normalizedInput }],
//   });

//   if (!user) return res.status(404).json({ message: "User not found" });

//   const isMatch = await bcrypt.compare(password, user.password);
//   if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

//   rateLimitMap.delete(emailOrPhone);

//   const token = generateJWT({ id: user._id, role: user.role });
//   res.json({
//     token,
//     user: { id: user._id, fullName: user.fullName, role: user.role },
//   });
// });

export const login = asyncHandler(async (req, res) => {
  const { emailOrPhone, password } = req.body;

  const normalizedInput = emailOrPhone.includes("@")
    ? emailOrPhone.toLowerCase()
    : emailOrPhone;

  const user = await User.findOne({
    $or: [{ email: normalizedInput }, { phone: normalizedInput }],
  });

  if (!user) return res.status(404).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

  rateLimitMap.delete(emailOrPhone);

  const token = generateJWT({ id: user._id, role: user.role });

  // ✅ حفظ التوكن الحالي
  user.currentToken = token;
  await user.save();

  res.json({
    token,
    user: { id: user._id, fullName: user.fullName, role: user.role },
  });
});


// @desc Logout
// export const logout = asyncHandler(async (req, res) => {
//   res.clearCookie("token"); // if using cookies
//   res.status(200).json({ message: "Logged out successfully" });
// });

export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.currentToken = null;
    await req.user.save();
  }
  res.status(200).json({ message: "Logged out successfully" });
});


// @desc Forgot Password (Send Reset Code)
export const forgotPassword = asyncHandler(async (req, res) => {
  const { emailOrPhone } = req.body;
  if (!emailOrPhone)
    return res.status(400).json({ message: "Please provide email or phone" });

  const normalizedInput = emailOrPhone.includes("@")
    ? emailOrPhone.toLowerCase()
    : emailOrPhone;

  const user = await User.findOne({
    $or: [{ email: normalizedInput }, { phone: normalizedInput }],
  });

  if (!user) return res.status(404).json({ message: "User not found" });

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedResetCode = await bcrypt.hash(resetCode, 9);

  user.passwordResetCode = hashedResetCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;
  await user.save();

  const html = `
    <h2 style="color: #4CAF50; text-align: center;">Password Reset Code</h2>
    <p>Use this code to reset your password. Code is valid for 10 minutes:</p>
    <h3 style="text-align: center; color: #333;">${resetCode}</h3>
    <p>Don't share this code with anyone.</p>
  `;

  try {
    await sendMail({
      email: user.email,
      subject: "Password Reset Code",
      html,
    });
    res.json({ message: "Reset code sent to email" });
  } catch (error) {
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;
    await user.save();
    res.status(500).json({ message: "Failed to send reset code" });
  }
});

// @desc Verify Reset Code
export const verifyResetCode = asyncHandler(async (req, res) => {
  const { emailOrPhone, resetCode } = req.body;
  if (!emailOrPhone || !resetCode) {
    return res
      .status(400)
      .json({ message: "Email/phone and reset code are required" });
  }

  const normalizedInput = emailOrPhone.includes("@")
    ? emailOrPhone.toLowerCase()
    : emailOrPhone;

  const user = await User.findOne({
    $or: [{ email: normalizedInput }, { phone: normalizedInput }],
    passwordResetExpires: { $gt: Date.now() },
    passwordResetCode: { $exists: true },
  });

  if (!user)
    return res.status(400).json({ message: "Invalid or expired reset code" });

  const matched = await bcrypt.compare(resetCode, user.passwordResetCode);
  if (!matched) return res.status(400).json({ message: "Invalid reset code" });

  user.passwordResetVerified = true;
  await user.save();
  res.json({ message: "Reset code verified successfully" });
});

// @desc Reset Password with Code
export const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const user = await User.findOne({
    passwordResetExpires: { $gt: Date.now() },
    passwordResetCode: { $exists: true },
    passwordResetVerified: true,
  });

  if (!user)
    return res.status(400).json({ message: "Invalid or expired reset code" });

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = undefined;
  await user.save();

  res.json({ message: "Password reset successfully" });
});
