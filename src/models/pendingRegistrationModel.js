import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, index: true },
    phone: { type: String, required: true, index: true },
    password: { type: String, required: true },
    year: { type: Number, required: true },
    departmentType: {
      type: String,
      enum: ["public", "private"],
      required: true,
    },
    university: { type: String, required: true },
    cardImage: { type: String, required: true },
    role: { type: String, enum: ["student"], default: "student" },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index to auto-delete expired docs
pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PendingRegistration", pendingRegistrationSchema);
