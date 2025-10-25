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
    // Set a timeout for compression (2 hours per video for very large files)
    const timeout = setTimeout(() => {
      reject(new Error("Video compression timeout (2 hours exceeded)"));
    }, 2 * 60 * 60 * 1000);

    ffmpeg(inputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-crf 28", // Quality setting (18-28, lower = better quality)
        "-preset ultrafast", // Fastest encoding (changed from 'fast')
        "-movflags +faststart", // Enable fast start for web streaming
        "-vf scale=1280:720", // Scale to 720p
        "-threads 0", // Use all available CPU threads
        "-max_muxing_queue_size 9999", // Prevent buffer issues for long videos
      ])
      .on("progress", (progress) => {
        // Log progress every 10%
        if (progress.percent && Math.round(progress.percent) % 10 === 0) {
          console.log(`   Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on("end", () => {
        clearTimeout(timeout);
        // Delete original file after compression
        fs.unlink(inputPath, (err) => {
          if (err) console.error("Error deleting original video:", err);
        });
        resolve(outputPath);
      })
      .on("error", (err) => {
        clearTimeout(timeout);
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
  // No file size limit - accept any size
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
  // No limits - accept any file size
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

    console.log(`🎬 Starting compression for ${videoFiles.length} video(s)...`);

    // Process each video file for compression in parallel (with concurrency limit)
    const compressionPromises = videoFiles.map(async (file, index) => {
      const tempPath = file.path;
      const finalFilename = file.filename.replace("temp-video-", "video-");
      const finalPath = path.join(path.dirname(tempPath), finalFilename);

      try {
        console.log(
          `📹 Compressing video ${index + 1}/${videoFiles.length}: ${
            file.originalname
          }`
        );
        await compressVideo(tempPath, finalPath);

        // Update file object with final filename
        file.filename = finalFilename;
        file.path = finalPath;
        console.log(`✅ Video ${index + 1} compressed: ${finalFilename}`);

        return { success: true, file };
      } catch (error) {
        console.error(
          `❌ Compression failed for video ${index + 1}:`,
          error.message
        );

        // If compression fails, use original file
        const renamed = await new Promise((resolve) => {
          fs.rename(tempPath, finalPath, (err) => {
            if (err) {
              console.error("Error renaming file:", err);
              resolve(false);
            } else {
              resolve(true);
            }
          });
        });

        if (renamed) {
          file.filename = finalFilename;
          file.path = finalPath;
        }

        return { success: false, file, error };
      }
    });

    // Wait for all compressions with a timeout
    const results = await Promise.allSettled(compressionPromises);

    console.log(
      `🎉 Compression complete: ${
        results.filter((r) => r.status === "fulfilled").length
      }/${videoFiles.length} successful`
    );

    next();
  } catch (error) {
    console.error("❌ Error in video compression middleware:", error);
    // Don't fail the request if compression fails
    next();
  }
};

export { uploadVideos, uploadVideosAndPdfs, compressVideosMiddleware };
