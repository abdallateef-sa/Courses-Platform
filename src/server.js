import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import ApiError from "./utils/ApiError.js";
import globalError from "./middlewares/errorMiddleware.js";
import dbConnection from "./config/database.js";
import indexRoute from "./routes/indexRoute.js";
import { specs, swaggerUi } from "./config/swagger.js";
import fs from "fs";
import path from "path";
import { streamVideo } from "./controllers/courseController.js";
import { isAuth } from "./middlewares/authMiddleware.js";

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

// Increase body size limits for large file uploads (no limit)
app.use(express.json({ limit: "5gb" }));
app.use(
  express.urlencoded({ limit: "5gb", extended: true, parameterLimit: 500000 })
);

// CORS configuration
app.use(cors());

// Video streaming with HTTP Range (Partial Content 206) overrides static
// Public access: no auth required
app.get("/api/v1/uploads/videos/:filename", streamVideo);

// Serve images, pdfs, and videos statically (fallback)
app.use(
  "/api/v1/uploads/images",
  express.static(path.join(process.cwd(), "src/uploads/images"))
);
app.use(
  "/api/v1/uploads/pdfs",
  express.static(path.join(process.cwd(), "src/uploads/pdfs"))
);
// Note: videos path handled by stream route above

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

// Swagger Documentation (Development Only)
// Only accessible when NODE_ENV=development
// In production, this route will not be available for security
if (process.env.NODE_ENV === "development") {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Courses Platform API Documentation",
      swaggerOptions: {
        docExpansion: "none",
        filter: true,
        showRequestDuration: true,
      },
    })
  );
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

// Increase timeout for very large file uploads (2 hours)
// Needed for long videos (e.g., 3-hour lectures)
server.timeout = 7200000; // 2 hours
server.keepAliveTimeout = 7200000;
server.headersTimeout = 7210000;

// handel rejection outside express
process.on("unhandledRejection", (err) => {
  console.error(`unhandledRejection Error: ${err.name} | ${err.message}`);
  server.close(() => {
    console.error("shutting down...");
    process.exit(1);
  });
});
