import mongoose from 'mongoose';

const pdfSchema = new mongoose.Schema({
  label: String,
  filename: String    // اسم الملف بعد الرفع
});

const sectionSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  videos:     [{ label: String, url: String }],
  pdfs:       [pdfSchema]
});

const courseSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  teacher:     { type: String, required: true },
  image: { type: String },
  sections:    [sectionSchema],
  followGroup: { type: String },
  comments:    [{ message: String, createdAt: Date }],
  lockedFor:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  price:       { type: Number, default: 0 }   // حقل السعر
}, { timestamps: true });

export default mongoose.model('Course', courseSchema);