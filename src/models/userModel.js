import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // lowercase
  },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  year: { type: Number, required: true },
  departmentType: {
    type: String,
    enum: ['public', 'private'],
    required: true,
  },
  university: { type: String, required: true },
  cardImage: { type: String },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  passwordResetCode: String,
  passwordResetExpires: Date,
  passwordResetVerified: Boolean,
}, { timestamps: true });

export default mongoose.model('User', userSchema);
