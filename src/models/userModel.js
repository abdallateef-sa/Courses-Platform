import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // lowercase
    },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    year: {
      type: Number,
      required: function () {
        return this.role === "student";
      },
    },
    departmentType: {
      type: String,
      enum: ["public", "private"],
      required: function () {
        return this.role === "student";
      },
    },
    university: {
      type: String,
      required: function () {
        return this.role === "student";
      },
    },
    cardImage: { type: String },
    role: {
      type: String,
      enum: ["student", "admin", "superadmin"],
      default: "student",
    },
    // Admin management fields
    adminActive: { type: Boolean, default: true },
    adminBadge: { type: String, default: null },
    wasAdmin: { type: Boolean, default: false },
    passwordResetCode: String,
    passwordResetExpires: Date,
    passwordResetVerified: Boolean,
    passwordResetLastResendAt: Date,
    emailVerified: { type: Boolean, default: false },
    emailVerificationCode: String,
    emailVerificationExpires: Date,
    fcmToken: String,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
