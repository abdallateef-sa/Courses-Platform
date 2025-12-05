import asyncHandler from "express-async-handler";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import generateJWT from "../utils/generateJWT.js";
import sendMail from "../utils/sendMail.js";
import { rateLimitMap } from "../middlewares/loginLimiter.js";
import PendingRegistration from "../models/pendingRegistrationModel.js";

// @desc Register new student
export const registerStudent = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, year, departmentType, university } =
    req.body;

  const normalizedEmail = email.trim().toLowerCase();

  if (!req.file) {
    return res
      .status(400)
      .json({ message: "Card image is required for students" });
  }

  // Check duplicates in DB
  const exists = await User.findOne({
    $or: [{ email: normalizedEmail }, { phone: phone.trim() }],
  });
  if (exists) {
    const imagePath = path.join("src/uploads/images", req.file.filename);
    fs.existsSync(imagePath) && fs.unlinkSync(imagePath);
    return res.status(409).json({ message: "Email or phone exists" });
  }

  if (!password || password.trim().length < 6) {
    const imagePath = path.join("src/uploads/images", req.file.filename);
    fs.existsSync(imagePath) && fs.unlinkSync(imagePath);
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  // Remove any existing pending with same email/phone and cleanup old image
  const phoneTrimmed = phone.trim();
  const oldPending = await PendingRegistration.findOne({
    $or: [{ email: normalizedEmail }, { phone: phoneTrimmed }],
  });
  if (oldPending && oldPending.cardImage) {
    const oldPath = path.join("src/uploads/images", oldPending.cardImage);
    fs.existsSync(oldPath) && fs.unlinkSync(oldPath);
    await PendingRegistration.deleteOne({ _id: oldPending._id });
  }

  const hashedPassword = await bcrypt.hash(password.trim(), 10);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 9);

  const pendingData = {
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: phoneTrimmed,
    password: hashedPassword,
    year,
    departmentType,
    university: university.trim(),
    cardImage: req.file.filename,
    role: "student",
    codeHash: otpHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };

  await PendingRegistration.create(pendingData);

  // Store pending identity in a short-lived cookie to allow resend without body
  try {
    res.cookie("pendingEmail", normalizedEmail, {
      maxAge: 10 * 60 * 1000, // 10 minutes
      httpOnly: true,
      sameSite: "lax",
    });
  } catch (_) {}

  const html = `
    <h2 style="color:#4CAF50; text-align:center;">Email Verification Code</h2>
    <p>Use this code to complete your registration. Valid for 10 minutes:</p>
    <h3 style="text-align:center; color:#333;">${otp}</h3>
    <p>Don't share this code with anyone.</p>
  `;

  try {
    await sendMail({ email: normalizedEmail, subject: "Your OTP Code", html });
    return res.status(200).json({
      message: "OTP sent to email. Please verify to complete registration.",
    });
  } catch (err) {
    const imagePath = path.join("src/uploads/images", req.file.filename);
    fs.existsSync(imagePath) && fs.unlinkSync(imagePath);
    await PendingRegistration.deleteMany({ email: normalizedEmail });
    return res
      .status(500)
      .json({ message: "Failed to send OTP. Please try again." });
  }
});

// @desc Verify student OTP and create account
export const verifyStudentRegistration = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const pending = await PendingRegistration.findOne({ email: normalizedEmail });
  if (!pending)
    return res
      .status(400)
      .json({ message: "No pending registration for this email" });

  if (pending.expiresAt.getTime() <= Date.now()) {
    if (pending.cardImage) {
      const img = path.join("src/uploads/images", pending.cardImage);
      fs.existsSync(img) && fs.unlinkSync(img);
    }
    await PendingRegistration.deleteOne({ _id: pending._id });
    return res
      .status(400)
      .json({ message: "Verification code expired. Please register again." });
  }

  const match = await bcrypt.compare(code, pending.codeHash);
  if (!match)
    return res.status(400).json({ message: "Invalid verification code" });

  const newUser = await User.create({
    fullName: pending.fullName,
    email: pending.email,
    phone: pending.phone,
    password: pending.password,
    year: pending.year,
    departmentType: pending.departmentType,
    university: pending.university,
    cardImage: pending.cardImage,
    role: "student",
    emailVerified: true,
  });

  await PendingRegistration.deleteOne({ _id: pending._id });

  const token = generateJWT({ id: newUser._id, role: newUser.role });
  return res.status(201).json({
    token,
    user: {
      id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
    },
  });
});

// @desc Resend student verification OTP
export const resendStudentVerificationCode = asyncHandler(async (req, res) => {
  const emailOrPhone = req.body && req.body.emailOrPhone;

  // Try to get identifier from body; else fall back to cookie
  let rawInput =
    typeof emailOrPhone === "string" ? emailOrPhone.trim() : emailOrPhone;
  if (!rawInput) {
    const cookieHeader = req.headers?.cookie || "";
    // Simple cookie parse to avoid dependency on cookie-parser
    const cookies = Object.fromEntries(
      cookieHeader
        .split(";")
        .map((kv) => kv.trim())
        .filter(Boolean)
        .map((kv) => {
          const idx = kv.indexOf("=");
          if (idx === -1) return [kv, ""];
          const k = kv.slice(0, idx);
          const v = decodeURIComponent(kv.slice(idx + 1));
          return [k, v];
        })
    );
    rawInput = cookies.pendingEmail;
  }

  if (!rawInput) {
    return res.status(400).json({
      message: "No identifier provided or stored. Please send email or phone.",
    });
  }

  const isEmail = typeof rawInput === "string" && rawInput.includes("@");
  const normalizedEmail = isEmail ? rawInput.toLowerCase() : undefined;
  const normalizedPhone = !isEmail ? rawInput : undefined;

  const pending = await PendingRegistration.findOne(
    isEmail ? { email: normalizedEmail } : { phone: normalizedPhone }
  );

  if (!pending) {
    return res.status(404).json({ message: "No pending registration found" });
  }

  // Basic resend throttling: limit to once per 60 seconds to protect performance
  const now = Date.now();
  if (
    pending.lastResendAt &&
    now - new Date(pending.lastResendAt).getTime() < 60 * 1000
  ) {
    return res
      .status(429)
      .json({ message: "Please wait before requesting another code" });
  }

  // Generate new OTP and update TTL
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 9);
  pending.codeHash = otpHash;
  pending.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  pending.lastResendAt = new Date();
  await pending.save();

  const html = `
    <h2 style="color:#4CAF50; text-align:center;">Email Verification Code</h2>
    <p>Use this code to complete your registration. Valid for 10 minutes:</p>
    <h3 style="text-align:center; color:#333;">${otp}</h3>
    <p>Don't share this code with anyone.</p>
  `;

  try {
    await sendMail({
      email: pending.email,
      subject: "Your OTP Code (Resend)",
      html,
    });
    return res.status(200).json({ message: "OTP resent to email" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to resend OTP. Please try again." });
  }
});

// @desc Register new admin
export const registerAdmin = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, year, departmentType, university } =
    req.body;

  const normalizedEmail = email.trim().toLowerCase();

  const exists = await User.findOne({
    $or: [{ email: normalizedEmail }, { phone: phone.trim() }],
  });
  if (exists) {
    return res.status(409).json({ message: "Email or phone exists" });
  }

  if (!password || password.trim().length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  const hashedPassword = await bcrypt.hash(password.trim(), 10);

  const newUser = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    password: hashedPassword,
    year, // retain fields if sent (minimal change philosophy)
    departmentType,
    university: university?.trim(),
    cardImage: req.file?.filename || null,
    role: "admin",
    adminActive: true,
    adminBadge: req.body.adminBadge || null,
    wasAdmin: true,
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
      adminActive: newUser.adminActive,
      adminBadge: newUser.adminBadge,
    },
  });
});

// @desc Superadmin: create an admin
export const createAdminBySuper = asyncHandler(async (req, res) => {
  const requester = await User.findById(req.user._id);
  if (!requester || requester.role !== "superadmin") {
    return res
      .status(403)
      .json({ message: "Only superadmin can create admins" });
  }

  const { fullName, email, phone, password, adminBadge } = req.body;
  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const exists = await User.findOne({
    $or: [{ email: normalizedEmail }, { phone: phone.trim() }],
  });
  if (exists) return res.status(409).json({ message: "Email or phone exists" });

  const hashedPassword = await bcrypt.hash(password.trim(), 10);
  const admin = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    password: hashedPassword,
    role: "admin",
    adminActive: true,
    adminBadge: adminBadge || null,
    wasAdmin: true,
  });
  res.status(201).json({
    message: "Admin created",
    admin: {
      id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      adminBadge: admin.adminBadge,
    },
  });
});

// @desc Superadmin: toggle admin active only
export const updateAdminStatus = asyncHandler(async (req, res) => {
  const requester = await User.findById(req.user._id);
  if (!requester || requester.role !== "superadmin") {
    return res
      .status(403)
      .json({ message: "Only superadmin can manage admins" });
  }
  const { adminId, active } = req.body;
  if (!adminId) return res.status(400).json({ message: "adminId is required" });
  const admin = await User.findById(adminId);
  if (!admin) return res.status(404).json({ message: "Admin not found" });
  if (admin.role !== "admin") {
    return res.status(400).json({ message: "Target user is not an admin" });
  }

  if (typeof active === "boolean") admin.adminActive = active;
  await admin.save();
  res.status(200).json({
    message: "Admin status updated",
    admin: {
      id: admin._id,
      role: admin.role,
      adminActive: admin.adminActive,
      adminBadge: admin.adminBadge,
      wasAdmin: admin.wasAdmin,
    },
  });
});

// @desc Login student or admin
export const login = asyncHandler(async (req, res) => {
  const { emailOrPhone, password } = req.body;

  // Normalize input: trim and lowercase if email
  const rawInput =
    typeof emailOrPhone === "string" ? emailOrPhone.trim() : emailOrPhone;
  const normalizedInput =
    typeof rawInput === "string" && rawInput.includes("@")
      ? rawInput.toLowerCase()
      : rawInput;

  const user = await User.findOne({
    $or: [{ email: normalizedInput }, { phone: normalizedInput }],
  });

  if (!user) return res.status(404).json({ message: "User not found" });

  // Require email verification for students
  if (user.role === "student" && !user.emailVerified) {
    return res.status(403).json({ message: "Please verify your email first" });
  }

  // Block inactive admins from logging in
  if (user.role === "admin" && user.adminActive === false) {
    return res.status(403).json({ message: "Admin account is deactivated" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

  // Single-session enforcement removed: students can login normally on multiple devices

  rateLimitMap.delete(rawInput);

  const token = generateJWT({ id: user._id, role: user.role });
  res.json({
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  });
});

// @desc Logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token"); // if using cookies
  res.status(200).json({ message: "Logged out successfully" });
});

// @desc Forgot Password (Send Reset Code)
export const forgotPassword = asyncHandler(async (req, res) => {
  const { emailOrPhone } = req.body;
  if (!emailOrPhone)
    return res.status(400).json({ message: "Please provide email or phone" });

  const rawInput =
    typeof emailOrPhone === "string" ? emailOrPhone.trim() : emailOrPhone;
  const normalizedInput =
    typeof rawInput === "string" && rawInput.includes("@")
      ? rawInput.toLowerCase()
      : rawInput;

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
  const rawInput =
    typeof emailOrPhone === "string" ? emailOrPhone.trim() : emailOrPhone;
  const normalizedInput =
    typeof rawInput === "string" && rawInput.includes("@")
      ? rawInput.toLowerCase()
      : rawInput;

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

// @desc Resend Forgot Password Code
export const resendResetCode = asyncHandler(async (req, res) => {
  const { emailOrPhone } = req.body || {};
  if (!emailOrPhone)
    return res.status(400).json({ message: "Please provide email or phone" });

  const rawInput =
    typeof emailOrPhone === "string" ? emailOrPhone.trim() : emailOrPhone;
  const normalizedInput =
    typeof rawInput === "string" && rawInput.includes("@")
      ? rawInput.toLowerCase()
      : rawInput;

  const user = await User.findOne({
    $or: [{ email: normalizedInput }, { phone: normalizedInput }],
  });
  if (!user) return res.status(404).json({ message: "User not found" });

  const now = Date.now();
  if (
    user.passwordResetLastResendAt &&
    now - new Date(user.passwordResetLastResendAt).getTime() < 60 * 1000
  ) {
    return res
      .status(429)
      .json({ message: "Please wait before requesting another code" });
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedResetCode = await bcrypt.hash(resetCode, 9);

  user.passwordResetCode = hashedResetCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;
  user.passwordResetLastResendAt = new Date();
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
      subject: "Password Reset Code (Resend)",
      html,
    });
    res.json({ message: "Reset code resent to email" });
  } catch (error) {
    // keep current state; client can retry later
    res.status(500).json({ message: "Failed to resend reset code" });
  }
});
