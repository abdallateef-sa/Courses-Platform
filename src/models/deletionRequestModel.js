import mongoose from "mongoose";

const deletionRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    email: { type: String, required: true, lowercase: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index to auto-delete expired requests
// Documents will be removed automatically after expiresAt

deleteionRequestIndexSetup();
function deleteionRequestIndexSetup() {
  try {
    deletionRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  } catch (e) {
    // noop
  }
}

export default mongoose.model("DeletionRequest", deletionRequestSchema);
