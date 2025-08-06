import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to compress video
const compressVideo = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-crf 28", // Quality setting (18-28, lower = better quality)
        "-preset medium", // Encoding speed vs compression ratio
        "-movflags +faststart", // Enable fast start for web streaming
        "-vf scale=1280:720", // Scale to 720p (adjust as needed)
      ])
      .on("end", () => {
        // Delete original file after compression
        fs.unlink(inputPath, (err) => {
          if (err) console.error("Error deleting original video:", err);
        });
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("Video compression error:", err);
        reject(err);
      })
      .save(outputPath);
  });
};

// Storage configuration for videos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the videos directory exists
    const uploadPath = path.join(__dirname, "..", "uploads", "videos");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const tempFilename =
      "temp-" + uniqueSuffix + path.extname(file.originalname);
    cb(null, tempFilename);
  },
});

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|avi|mkv|mov|wmv|flv|webm|m4v/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only video files are allowed"), false);
  }
};

// Video upload configuration
const uploadVideos = multer({
  storage: videoStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: videoFileFilter,
});

// Combined upload for videos and PDFs
const uploadVideosAndPdfs = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadPath;
      if (file.fieldname === "videos") {
        uploadPath = path.join(__dirname, "..", "uploads", "videos");
      } else if (file.fieldname === "pdfs") {
        uploadPath = path.join(__dirname, "..", "uploads", "pdfs");
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      let prefix = file.fieldname === "videos" ? "temp-video-" : "pdf-";
      cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "videos") {
      const allowedVideoTypes = /mp4|avi|mkv|mov|wmv|flv|webm|m4v/;
      const extname = allowedVideoTypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      const mimetype = allowedVideoTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        return cb(
          new Error("Only video files are allowed for videos field"),
          false
        );
      }
    } else if (file.fieldname === "pdfs") {
      const allowedPdfTypes = /pdf/;
      const extname = allowedPdfTypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      const mimetype = file.mimetype === "application/pdf";

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        return cb(
          new Error("Only PDF files are allowed for pdfs field"),
          false
        );
      }
    } else {
      return cb(new Error("Unexpected field"), false);
    }
  },
});

// Middleware to compress videos after upload
const compressVideosMiddleware = async (req, res, next) => {
  if (!req.files) {
    return next();
  }

  try {
    // When using .fields(), req.files is an object with field names as keys
    const videoFiles = req.files.videos || [];

    if (videoFiles.length === 0) {
      return next();
    }

    // Process each video file for compression
    for (let i = 0; i < videoFiles.length; i++) {
      const file = videoFiles[i];
      const tempPath = file.path;
      const finalFilename = file.filename.replace("temp-", "");
      const finalPath = path.join(path.dirname(tempPath), finalFilename);

      try {
        await compressVideo(tempPath, finalPath);
        // Update file object with final filename
        file.filename = finalFilename;
        file.path = finalPath;
        console.log(`Video compressed successfully: ${finalFilename}`);
      } catch (error) {
        console.error(`Error compressing video ${file.filename}:`, error);
        // If compression fails, use original file
        fs.rename(tempPath, finalPath, (err) => {
          if (err) console.error("Error renaming file:", err);
        });
        file.filename = finalFilename;
        file.path = finalPath;
      }
    }

    next();
  } catch (error) {
    console.error("Error in video compression middleware:", error);
    next(error);
  }
};

export { uploadVideos, uploadVideosAndPdfs, compressVideosMiddleware };
