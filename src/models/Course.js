import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videos: [{
    label: String,
    url: String
  }],
  pdfs: [{
    label: String,
    url: String
  }]
});

const courseSchema = new mongoose.Schema({
  name:         { type: String, required: true, unique: true },
  teacher:      { type: String, required: true },
  sections:     [sectionSchema],
  followGroup:  { type: String }, // WhatsApp link
  comments:     [{
    message: String,
    createdAt: { type: Date, default: Date.now }
  }],
  lockedFor:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export default mongoose.model('Course', courseSchema);