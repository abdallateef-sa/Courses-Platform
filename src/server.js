import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import ApiError from "./utils/ApiError.js";
import globalError from "./middlewares/errorMiddleware.js";
import dbConnection from "./config/database.js";
import indexRoute from "./routes/indexRoute.js";
import fs from "fs";
import path from "path";

// Create folders if not exist
const imagePath = path.join("src", "uploads", "images");
const pdfPath = path.join("src", "uploads", "pdfs");
const videoPath = path.join("src", "uploads", "videos");

[imagePath, pdfPath, videoPath].forEach((folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`Created folder: ${folder}`);
  }
});

dotenv.config();

//connect with db
dbConnection();

const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(cors());

// Serve images, pdfs, and videos statically
app.use(
  "/api/v1/uploads/images",
  express.static(path.join(process.cwd(), "src/uploads/images"))
);
app.use(
  "/api/v1/uploads/pdfs",
  express.static(path.join(process.cwd(), "src/uploads/pdfs"))
);
app.use(
  "/api/v1/uploads/videos",
  express.static(path.join(process.cwd(), "src/uploads/videos"))
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

//Mount Routes
app.use("/api/v1", indexRoute);

app.use((req, res, next) => {
  next(new ApiError(`Can't find this route: ${req.originalUrl}`, 404));
});

// Global error handling middleware for express
app.use(globalError);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log("server run on port", PORT);
});

// handel rejection outside express
process.on("unhandledRejection", (err) => {
  console.error(`unhandledRejection Error: ${err.name} | ${err.message}`);
  server.close(() => {
    console.error("shutting down...");
    process.exit(1);
  });
});
