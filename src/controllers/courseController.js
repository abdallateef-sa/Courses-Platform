import asyncHandler from "express-async-handler";
import Course from "../models/courseModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import fs from "fs";
import path from "path";
import { fcm } from "../config/firebase.js";

// @desc Create new course (admin only)
export const createCourse = asyncHandler(async (req, res) => {
  const {
    name,
    teacher,
    followGroup,
    price,
    whatsappNumber,
    overview,
    published,
    notes,
  } = req.body;
  const createdBy = req.user._id;

  // normalize notes: accept string or array of strings
  const normalizedNotes = Array.isArray(notes)
    ? notes
        .filter(Boolean)
        .map((t) => ({ text: String(t), createdAt: new Date() }))
    : notes
    ? [{ text: String(notes), createdAt: new Date() }]
    : [];

  // Coerce published to boolean (supports form-data strings)
  let publishedFlag = false;
  if (typeof published === "string") {
    publishedFlag = published.toLowerCase() === "true";
  } else if (typeof published === "boolean") {
    publishedFlag = published;
  }

  const course = await Course.create({
    name,
    teacher,
    followGroup,
    price,
    whatsappNumber,
    createdBy,
    image: req.file?.filename || null,
    overview,
    published: publishedFlag,
    notes: normalizedNotes,
  });

  // Get all users to send notifications
  const allUsers = await User.find({ role: "student" }, "_id fcmToken");

  if (allUsers.length > 0) {
    // Add notifications to DB for all users
    const notifications = allUsers.map((user) => ({
      userId: user._id,
      courseName: name,
      message: `New course available: ${name} by ${teacher}`,
    }));
    await Notification.insertMany(notifications);

    // Get FCM tokens for push notifications
    const tokens = allUsers.map((u) => u.fcmToken).filter(Boolean);

    if (tokens.length > 0) {
      const messagePayload = {
        tokens,
        notification: {
          title: "New Course Available!",
          body: `${name} by ${teacher} is now available`,
        },
        data: {
          courseName: name,
          teacher: teacher,
          type: "new_course",
          timestamp: new Date().toISOString(),
        },
      };

      try {
        const response = await fcm.sendEachForMulticast(messagePayload);
        console.log(
          "✅ FCM notifications sent for new course:",
          response.successCount,
          "success"
        );
        if (response.failureCount > 0) {
          console.log(
            "❌ Failed tokens:",
            response.responses.filter((r) => !r.success).length
          );
        }
      } catch (error) {
        console.error("❌ Error sending FCM for new course:", error);
      }
    } else {
      console.log("📱 No FCM tokens found for users");
    }
  }

  res.status(201).json({
    message: "Course created successfully",
    course,
  });
});

// @desc Update course (admin only)
export const updateCourse = asyncHandler(async (req, res) => {
  const {
    courseName,
    newName,
    teacher,
    followGroup,
    price,
    whatsappNumber,
    overview,
  } = req.body;

  if (!courseName) {
    return res.status(400).json({ message: "Course name is required" });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Check authorization
  if (
    course.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin" &&
    req.user.role !== "superadmin"
  ) {
    return res.status(403).json({
      message: "Not authorized to update this course",
    });
  }

  // Delete old image if new one is uploaded
  if (req.file && course.image) {
    const oldImagePath = path.join("src", "uploads", "images", course.image);
    fs.unlink(oldImagePath, () => {});
  }

  // Update course fields
  if (newName && newName !== courseName) {
    const existingCourse = await Course.findOne({ name: newName });
    if (existingCourse) {
      return res.status(400).json({ message: "Course name already exists" });
    }
    course.name = newName;
  }

  if (teacher) course.teacher = teacher;
  if (followGroup) course.followGroup = followGroup;
  if (price !== undefined) course.price = price;
  if (whatsappNumber) course.whatsappNumber = whatsappNumber;
  if (typeof overview !== "undefined") course.overview = overview;
  if (req.file) course.image = req.file.filename;

  await course.save();

  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;

  res.status(200).json({
    message: "Course updated successfully",
    course: {
      ...course.toObject(),
      imageUrl: course.image ? imageBaseUrl + course.image : null,
    },
  });
});

// @desc add new Section in Course
export const addSection = asyncHandler(async (req, res) => {
  const {
    courseName,
    title,
    isFree,
    videoLabels,
    pdfLabels,
    pdfDownloadable,
    pdfFolders,
    pdfFolder,
  } = req.body;

  // Validate required fields
  if (!courseName || !title) {
    return res.status(400).json({
      message: "courseName and title are required",
    });
  }

  // Find course
  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Parse JSON arrays safely
  const videoLabelList = videoLabels ? JSON.parse(videoLabels) : [];
  const pdfLabelList = pdfLabels ? JSON.parse(pdfLabels) : [];
  const pdfDownloadableList = pdfDownloadable
    ? JSON.parse(pdfDownloadable)
    : [];
  const pdfFolderList = pdfFolders ? JSON.parse(pdfFolders) : [];

  // Coerce isFree to boolean
  let isFreeFlag = false;
  if (typeof isFree === "string") {
    isFreeFlag = isFree.toLowerCase() === "true";
  } else if (typeof isFree === "boolean") {
    isFreeFlag = isFree;
  }

  // Create new section
  const newSection = {
    title,
    isFree: isFreeFlag,
    videos: [],
    pdfs: [],
  };

  // Base URLs for file serving
  const videoBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/videos/`;
  const pdfBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/pdfs/`;

  // Helper: flatten nested pdf structure into ordered leaves with folder paths
  // Supports two shapes for folders:
  // 1) Object form: { folder: "Folder", children: [ ...nodes ] }
  // 2) Array form: ["Folder", ...nodes]
  // Leaf nodes are strings representing labels (e.g., "Chapter 1 PDF")
  const flattenPdfTree = (nodes, currentPath = "") => {
    const results = [];
    const pathJoin = (a, b) => (a ? `${a}/${b}` : b);

    const walk = (node, basePath) => {
      if (typeof node === "string") {
        results.push({ label: node, folder: basePath || undefined });
        return;
      }
      if (
        Array.isArray(node) &&
        node.length > 0 &&
        typeof node[0] === "string"
      ) {
        const folderName = node[0];
        const nextPath = pathJoin(basePath, folderName);
        for (let i = 1; i < node.length; i++) {
          walk(node[i], nextPath);
        }
        return;
      }
      if (
        node &&
        typeof node === "object" &&
        !Array.isArray(node) &&
        typeof node.folder === "string" &&
        Array.isArray(node.children)
      ) {
        const nextPath = pathJoin(basePath, node.folder);
        node.children.forEach((child) => walk(child, nextPath));
        return;
      }
      throw new Error("Invalid pdfs structure: unsupported node shape");
    };

    if (Array.isArray(nodes)) {
      nodes.forEach((n) => walk(n, currentPath));
    } else {
      walk(nodes, currentPath);
    }

    return results;
  };

  // Helper: split a potential path-like label into { folder, basename }
  const splitPathLabel = (raw) => {
    if (typeof raw !== "string") return { folder: undefined, basename: raw };
    const normalized = raw.replace(/\\/g, "/");
    if (!normalized.includes("/"))
      return { folder: undefined, basename: normalized };
    const parts = normalized.split("/").filter(Boolean);
    const basename = parts.pop();
    const folder = parts.length ? parts.join("/") : undefined;
    return { folder, basename };
  };

  // Helper: robust boolean coercion for values like true/false, "true"/"false", 1/0, "1"/"0", "yes"/"no"
  const toBool = (v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v === 1;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (["true", "1", "yes"].includes(s)) return true;
      if (["false", "0", "no"].includes(s)) return false;
    }
    return false;
  };

  if (req.files) {
    // Handle video files
    if (req.files.videos) {
      req.files.videos.forEach((file, index) => {
        newSection.videos.push({
          label: videoLabelList[index] || file.originalname,
          filename: file.filename,
        });
      });
    }

    // Handle PDF files
    if (req.files.pdfs) {
      const bodyHasNestedPdfs =
        typeof req.body.pdfs === "string" ||
        typeof req.body.pdfTree === "string" ||
        typeof req.body.pdfsStructure === "string";

      if (bodyHasNestedPdfs) {
        const raw = req.body.pdfs || req.body.pdfTree || req.body.pdfsStructure;
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          return res.status(400).json({
            message:
              "Invalid JSON in 'pdfs' (or 'pdfTree'/'pdfsStructure'). Provide valid JSON.",
          });
        }

        let flattened;
        try {
          flattened = flattenPdfTree(parsed);
        } catch (err) {
          return res.status(400).json({ message: err.message });
        }

        if (flattened.length !== req.files.pdfs.length) {
          return res.status(400).json({
            message:
              "Mismatch between number of uploaded PDFs and leaves in 'pdfs' structure",
            expectedLeaves: flattened.length,
            uploadedFiles: req.files.pdfs.length,
          });
        }

        req.files.pdfs.forEach((file, index) => {
          const leaf = flattened[index] || {};
          const downloadable =
            index < pdfDownloadableList.length
              ? toBool(pdfDownloadableList[index])
              : false;

          // Allow additional path info embedded in leaf.label itself
          let labelFromLeaf =
            leaf.label || pdfLabelList[index] || file.originalname;
          const { folder: folderFromLabel, basename } =
            splitPathLabel(labelFromLeaf);
          const combinedFolder =
            [leaf.folder, folderFromLabel].filter(Boolean).join("/") ||
            undefined;

          newSection.pdfs.push({
            label: basename,
            filename: file.filename,
            downloadable,
            folder: combinedFolder,
          });
        });
      } else {
        // Backward-compatible: use flat labels/folders arrays
        req.files.pdfs.forEach((file, index) => {
          const downloadable =
            index < pdfDownloadableList.length
              ? toBool(pdfDownloadableList[index])
              : false;

          let rawLabel = pdfLabelList[index];
          // Accept array form in pdfLabels like ["folder/sub", "name.pdf"]
          if (Array.isArray(rawLabel) && rawLabel.length > 0) {
            const parts = rawLabel.map((p) => String(p));
            const basenameArr = parts.pop();
            const folderArr = parts.filter(Boolean).join("/") || undefined;
            rawLabel = folderArr ? `${folderArr}/${basenameArr}` : basenameArr;
          }

          rawLabel =
            typeof rawLabel === "string" ? rawLabel : file.originalname;
          const { folder: derivedFolder, basename } = splitPathLabel(rawLabel);
          const folderName =
            derivedFolder ||
            (index < pdfFolderList.length && pdfFolderList[index]) ||
            pdfFolder ||
            undefined;

          newSection.pdfs.push({
            label: basename,
            filename: file.filename,
            downloadable,
            folder: folderName,
          });
        });
      }
    }
  }

  // Add section to course and save
  course.sections.push(newSection);
  await course.save();

  // Prepare response
  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;

  const response = {
    message: "Section added successfully",
    course: {
      ...course.toObject(),
      imageUrl: course.image ? imageBaseUrl + course.image : null,
      sectionsCount: course.sections.length,
      sections: course.sections.map((section) => ({
        _id: section._id,
        title: section.title,
        isFree: !!section.isFree,
        videoCount: Array.isArray(section.videos) ? section.videos.length : 0,
        pdfCount: Array.isArray(section.pdfs) ? section.pdfs.length : 0,
        videos: section.videos.map((video) => ({
          _id: video._id,
          label: video.label,
          filename: video.filename,
          url: videoBaseUrl + video.filename,
        })),
        pdfs: (() => {
          const groups = {};
          section.pdfs.forEach((pdf) => {
            const key = pdf.folder || "noFolder";
            if (!groups[key]) groups[key] = [];
            groups[key].push({
              _id: pdf._id,
              label: pdf.label,
              filename: pdf.filename,
              url: pdfBaseUrl + pdf.filename,
              downloadable: pdf.downloadable || false,
              folder: pdf.folder || null,
            });
          });
          return Object.keys(groups).map((k) => ({
            folder: k,
            files: groups[k],
          }));
        })(),
      })),
    },
  };

  res.status(200).json(response);
});

// @desc List all courses (admin only)
export const listCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find();
  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;
  const videoBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/videos/`;
  const pdfBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/pdfs/`;
  // Prefetch enrolled students across all courses to avoid N+1 queries
  const allEnrolledIds = Array.from(
    new Set(
      courses.flatMap((c) => (Array.isArray(c.lockedFor) ? c.lockedFor : []))
    )
  );
  const studentsLookup = new Map();
  if (allEnrolledIds.length > 0) {
    const students = await User.find(
      { _id: { $in: allEnrolledIds }, role: "student" },
      "_id fullName email phone role cardImage"
    ).lean();
    students.forEach((s) => studentsLookup.set(String(s._id), s));
  }

  const formattedCourses = courses.map((course) => ({
    _id: course._id,
    name: course.name,
    teacher: course.teacher,
    price: course.price,
    whatsappNumber: course.whatsappNumber,
    overview: course.overview || null,
    published: !!course.published,
    image: course.image,
    imageUrl: course.image ? imageBaseUrl + course.image : null,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    enrolledCount: Array.isArray(course.lockedFor)
      ? course.lockedFor.length
      : 0,
    enrolledStudents: (Array.isArray(course.lockedFor) ? course.lockedFor : [])
      .map((id) => studentsLookup.get(String(id)))
      .filter(Boolean)
      .map((s) => ({
        _id: s._id,
        fullName: s.fullName,
        email: s.email,
        phone: s.phone,
        role: s.role,
        cardImage: s.cardImage || null,
        imageUrl: s.cardImage ? imageBaseUrl + s.cardImage : null,
      })),
    notes: (course.notes || []).map((n) => ({
      _id: n._id,
      text: n.text,
      createdAt: n.createdAt,
    })),
    sectionsCount: course.sections.length,
    sections: course.sections.map((section) => ({
      _id: section._id,
      title: section.title,
      isFree: !!section.isFree,
      videoCount: Array.isArray(section.videos) ? section.videos.length : 0,
      pdfCount: Array.isArray(section.pdfs) ? section.pdfs.length : 0,
      videos: section.videos.map((video) => ({
        _id: video._id,
        label: video.label,
        filename: video.filename,
        url: videoBaseUrl + video.filename,
      })),
      pdfs: (() => {
        const groups = {};
        section.pdfs.forEach((pdf) => {
          const key = pdf.folder || "noFolder";
          if (!groups[key]) groups[key] = [];
          groups[key].push({
            _id: pdf._id,
            label: pdf.label,
            filename: pdf.filename,
            url: pdfBaseUrl + pdf.filename,
            downloadable: pdf.downloadable || false,
            folder: pdf.folder || null,
          });
        });
        return Object.keys(groups).map((k) => ({
          folder: k,
          files: groups[k],
        }));
      })(),
    })),
  }));
  res.status(200).json({
    count: courses.length,
    courses: formattedCourses,
  });
});

// @desc List all published courses (student view)
export const listCoursesForStudent = asyncHandler(async (req, res) => {
  const courses = await Course.find({ published: true });
  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;
  const videoBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/videos/`;
  const pdfBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/pdfs/`;
  const formattedCourses = courses.map((course) => ({
    _id: course._id,
    name: course.name,
    teacher: course.teacher,
    price: course.price,
    whatsappNumber: course.whatsappNumber,
    followGroup: course.followGroup,
    overview: course.overview || null,
    published: !!course.published,
    image: course.image,
    imageUrl: course.image ? imageBaseUrl + course.image : null,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    notes: (course.notes || []).map((n) => ({
      _id: n._id,
      text: n.text,
      createdAt: n.createdAt,
    })),
    sectionsCount: course.sections.length,
    sections: course.sections.map((section) => ({
      _id: section._id,
      title: section.title,
      isFree: !!section.isFree,
      videoCount: Array.isArray(section.videos) ? section.videos.length : 0,
      pdfCount: Array.isArray(section.pdfs) ? section.pdfs.length : 0,
      videos: section.videos.map((video) => ({
        _id: video._id,
        label: video.label,
        filename: video.filename,
        url: videoBaseUrl + video.filename,
      })),
      pdfs: (() => {
        const groups = {};
        section.pdfs.forEach((pdf) => {
          const key = pdf.folder || "noFolder";
          if (!groups[key]) groups[key] = [];
          groups[key].push({
            _id: pdf._id,
            label: pdf.label,
            filename: pdf.filename,
            url: pdfBaseUrl + pdf.filename,
            downloadable: pdf.downloadable || false,
            folder: pdf.folder || null,
          });
        });
        return Object.keys(groups).map((k) => ({
          folder: k,
          files: groups[k],
        }));
      })(),
    })),
  }));
  res.status(200).json({
    count: courses.length,
    courses: formattedCourses,
  });
});

// @desc Get course detail for student
export const getCourse = asyncHandler(async (req, res) => {
  const { courseName } = req.query;
  if (!courseName) {
    return res.status(400).json({ message: "Course name is required" });
  }
  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }
  // For public/student access, hide unpublished courses
  if (!course.published) {
    return res.status(404).json({ message: "Course not found" });
  }
  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;
  const videoBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/videos/`;
  const pdfBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/pdfs/`;
  const formattedCourse = {
    _id: course._id,
    name: course.name,
    teacher: course.teacher,
    price: course.price,
    whatsappNumber: course.whatsappNumber,
    followGroup: course.followGroup,
    overview: course.overview || null,
    published: !!course.published,
    image: course.image,
    imageUrl: course.image ? imageBaseUrl + course.image : null,
    createdBy: course.createdBy,
    lockedFor: course.lockedFor,
    comments: course.comments.map((comment) => ({
      _id: comment._id,
      message: comment.message,
      createdAt: comment.createdAt,
    })),
    notes: (course.notes || []).map((n) => ({
      _id: n._id,
      text: n.text,
      createdAt: n.createdAt,
    })),
    sectionsCount: course.sections.length,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    sections: course.sections.map((section) => ({
      _id: section._id,
      title: section.title,
      isFree: !!section.isFree,
      videoCount: Array.isArray(section.videos) ? section.videos.length : 0,
      pdfCount: Array.isArray(section.pdfs) ? section.pdfs.length : 0,
      videos: section.videos.map((video) => ({
        _id: video._id,
        label: video.label,
        filename: video.filename,
        url: videoBaseUrl + video.filename,
      })),
      pdfs: (() => {
        const groups = {};
        section.pdfs.forEach((pdf) => {
          const key = pdf.folder || "noFolder";
          if (!groups[key]) groups[key] = [];
          groups[key].push({
            _id: pdf._id,
            label: pdf.label,
            filename: pdf.filename,
            url: pdfBaseUrl + pdf.filename,
            downloadable: pdf.downloadable || false,
            folder: pdf.folder || null,
          });
        });
        return Object.keys(groups).map((k) => ({
          folder: k,
          files: groups[k],
        }));
      })(),
    })),
  };
  res.status(200).json(formattedCourse);
});

// @desc Get course detail for admin (includes unpublished)
export const getCourseAdmin = asyncHandler(async (req, res) => {
  const { courseName } = req.query;
  if (!courseName) {
    return res.status(400).json({ message: "Course name is required" });
  }
  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }
  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;
  const videoBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/videos/`;
  const pdfBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/pdfs/`;
  const formattedCourse = {
    _id: course._id,
    name: course.name,
    teacher: course.teacher,
    price: course.price,
    whatsappNumber: course.whatsappNumber,
    followGroup: course.followGroup,
    overview: course.overview || null,
    published: !!course.published,
    image: course.image,
    imageUrl: course.image ? imageBaseUrl + course.image : null,
    createdBy: course.createdBy,
    lockedFor: course.lockedFor,
    enrolledCount: Array.isArray(course.lockedFor)
      ? course.lockedFor.length
      : 0,
    enrolledStudents: [],
    comments: course.comments.map((comment) => ({
      _id: comment._id,
      message: comment.message,
      createdAt: comment.createdAt,
    })),
    notes: (course.notes || []).map((n) => ({
      _id: n._id,
      text: n.text,
      createdAt: n.createdAt,
    })),
    sectionsCount: course.sections.length,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    sections: course.sections.map((section) => ({
      _id: section._id,
      title: section.title,
      isFree: !!section.isFree,
      videoCount: Array.isArray(section.videos) ? section.videos.length : 0,
      pdfCount: Array.isArray(section.pdfs) ? section.pdfs.length : 0,
      videos: section.videos.map((video) => ({
        _id: video._id,
        label: video.label,
        filename: video.filename,
        url: videoBaseUrl + video.filename,
      })),
      pdfs: (() => {
        const groups = {};
        section.pdfs.forEach((pdf) => {
          const key = pdf.folder || "noFolder";
          if (!groups[key]) groups[key] = [];
          groups[key].push({
            _id: pdf._id,
            label: pdf.label,
            filename: pdf.filename,
            url: pdfBaseUrl + pdf.filename,
            downloadable: pdf.downloadable || false,
            folder: pdf.folder || null,
          });
        });
        return Object.keys(groups).map((k) => ({
          folder: k,
          files: groups[k],
        }));
      })(),
    })),
  };
  // Enrich enrolledStudents with user details
  if (Array.isArray(course.lockedFor) && course.lockedFor.length > 0) {
    const imageBase = imageBaseUrl;
    const students = await User.find(
      { _id: { $in: course.lockedFor }, role: "student" },
      "_id fullName email phone role cardImage"
    ).lean();
    formattedCourse.enrolledStudents = students.map((s) => ({
      _id: s._id,
      fullName: s.fullName,
      email: s.email,
      phone: s.phone,
      role: s.role,
      cardImage: s.cardImage || null,
      imageUrl: s.cardImage ? imageBase + s.cardImage : null,
    }));
  }
  res.status(200).json(formattedCourse);
});

// @desc Set course published status (admin only)
export const setCourseStatus = asyncHandler(async (req, res) => {
  const { courseName, published } = req.body;
  if (!courseName || typeof published !== "boolean") {
    return res
      .status(400)
      .json({ message: "courseName and published(boolean) are required" });
  }
  const course = await Course.findOne({ name: courseName });
  if (!course) return res.status(404).json({ message: "Course not found" });

  // only creator admin or admin role can update
  if (
    course.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin" &&
    req.user.role !== "superadmin"
  ) {
    return res.status(403).json({ message: "Not authorized to update status" });
  }

  course.published = published;
  await course.save();
  return res
    .status(200)
    .json({ message: "Course status updated", published: course.published });
});

// @desc Add a note to course (admin only)
export const addCourseNote = asyncHandler(async (req, res) => {
  const { courseName, note } = req.body;
  if (!courseName || !note) {
    return res
      .status(400)
      .json({ message: "courseName and note are required" });
  }
  const course = await Course.findOne({ name: courseName });
  if (!course) return res.status(404).json({ message: "Course not found" });

  if (
    course.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin" &&
    req.user.role !== "superadmin"
  ) {
    return res.status(403).json({ message: "Not authorized to add notes" });
  }

  if (!course.notes) course.notes = [];
  course.notes.push({ text: String(note), createdAt: new Date() });
  await course.save();

  // Create notifications for all enrolled students
  const notifications = course.lockedFor.map((userId) => ({
    userId,
    courseName,
    message: `New note on ${courseName}: ${note}`,
  }));
  if (notifications.length) {
    await Notification.insertMany(notifications);
  }

  // Send FCM push notifications
  try {
    const users = await User.find(
      { _id: { $in: course.lockedFor } },
      "fcmToken"
    );
    const tokens = users.map((u) => u.fcmToken).filter(Boolean);
    if (tokens.length > 0) {
      const messagePayload = {
        tokens,
        notification: {
          title: `New note on ${courseName}`,
          body: String(note),
        },
        data: {
          courseName,
          type: "note",
          timestamp: new Date().toISOString(),
        },
      };
      const response = await fcm.sendEachForMulticast(messagePayload);
      console.log(
        "✅ FCM notifications for note:",
        response.successCount,
        "success"
      );
    } else {
      console.log("📱 No FCM tokens found for course students");
    }
  } catch (error) {
    console.error("❌ Error sending FCM for note:", error);
  }

  return res.status(200).json({
    message: "Note added and notifications sent",
    notes: course.notes,
  });
});

// @desc Delete a note from course (admin only)
export const deleteCourseNote = asyncHandler(async (req, res) => {
  const { courseName, noteId } = req.body;
  if (!courseName || !noteId) {
    return res
      .status(400)
      .json({ message: "courseName and noteId are required" });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) return res.status(404).json({ message: "Course not found" });

  if (
    course.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin" &&
    req.user.role !== "superadmin"
  ) {
    return res.status(403).json({ message: "Not authorized to delete notes" });
  }

  const note = course.notes?.id(noteId);
  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }

  note.deleteOne();
  await course.save();

  return res.status(200).json({ message: "Note deleted", notes: course.notes });
});

// @desc Get course by adminID
export const searchCoursesByAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.query;
  if (!adminId)
    return res.status(400).json({ message: "Admin ID is required" });

  const courses = await Course.find({ createdBy: adminId });
  res.json(courses);
});

// @desc Open course for a student (admin only)
export const openCourseForUser = asyncHandler(async (req, res) => {
  const { courseName } = req.body;
  const { emailOrPhone } = req.body;

  const course = await Course.findOne({ name: courseName });
  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  });
  if (!course || !user)
    return res.status(404).json({ message: "Course or user not found" });

  if (!course.lockedFor.includes(user._id)) {
    course.lockedFor.push(user._id);
    await course.save();
  }

  res.json({ message: "Course opened for user" });
});

// @desc Remove a student from a course (admin only)
export const removeStudentFromCourse = asyncHandler(async (req, res) => {
  const { courseName, emailOrPhone } = req.body;

  if (!courseName || !emailOrPhone) {
    return res
      .status(400)
      .json({ message: "courseName and emailOrPhone are required" });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Only creator admin, admin role, or superadmin can modify enrollment
  if (
    course.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin" &&
    req.user.role !== "superadmin"
  ) {
    return res
      .status(403)
      .json({ message: "Not authorized to modify course enrollment" });
  }

  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    role: "student",
  });
  if (!user) {
    return res.status(404).json({ message: "Student not found" });
  }

  const before = course.lockedFor.length;
  course.lockedFor = course.lockedFor.filter(
    (uid) => uid.toString() !== user._id.toString()
  );
  const after = course.lockedFor.length;

  if (before === after) {
    return res.status(404).json({ message: "Student not enrolled in course" });
  }

  await course.save();

  return res.status(200).json({ message: "Student removed from course" });
});

// @desc List courses opened for current student
export const listUserCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({
    lockedFor: req.user._id,
    published: true,
  });
  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;
  const videoBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/videos/`;
  const pdfBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/pdfs/`;
  const formattedCourses = courses.map((course) => ({
    _id: course._id,
    name: course.name,
    teacher: course.teacher,
    price: course.price,
    whatsappNumber: course.whatsappNumber,
    followGroup: course.followGroup,
    image: course.image,
    imageUrl: course.image ? imageBaseUrl + course.image : null,
    notes: (course.notes || []).map((n) => ({
      _id: n._id,
      text: n.text,
      createdAt: n.createdAt,
    })),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    sectionsCount: course.sections.length,
    sections: course.sections.map((section) => ({
      _id: section._id,
      title: section.title,
      isFree: !!section.isFree,
      videoCount: Array.isArray(section.videos) ? section.videos.length : 0,
      pdfCount: Array.isArray(section.pdfs) ? section.pdfs.length : 0,
      videos: section.videos.map((video) => ({
        _id: video._id,
        label: video.label,
        filename: video.filename,
        url: videoBaseUrl + video.filename,
      })),
      pdfs: (() => {
        const groups = {};
        section.pdfs.forEach((pdf) => {
          const key = pdf.folder || "noFolder";
          if (!groups[key]) groups[key] = [];
          groups[key].push({
            _id: pdf._id,
            label: pdf.label,
            filename: pdf.filename,
            url: pdfBaseUrl + pdf.filename,
            downloadable: pdf.downloadable || false,
            folder: pdf.folder || null,
          });
        });
        return Object.keys(groups).map((k) => ({
          folder: k,
          files: groups[k],
        }));
      })(),
    })),
  }));
  res.status(200).json({
    count: courses.length,
    courses: formattedCourses,
  });
});

// @desc delete course
export const deleteCourse = asyncHandler(async (req, res) => {
  const { courseName } = req.body;
  if (!courseName)
    return res.status(400).json({ message: "Course name is required" });

  const course = await Course.findOne({ name: courseName });
  if (!course) return res.status(404).json({ message: "Course not found" });

  // Delete course image
  if (course.image) {
    const imagePath = path.join("src", "uploads", "images", course.image);
    fs.unlink(imagePath, () => {});
  }

  // Delete all files from all sections
  course.sections.forEach((section) => {
    // Delete videos
    section.videos.forEach((video) => {
      if (video.filename) {
        const videoPath = path.join("src", "uploads", "videos", video.filename);
        fs.unlink(videoPath, () => {});
      }
    });

    // Delete PDFs
    section.pdfs.forEach((pdf) => {
      if (pdf.filename) {
        const pdfPath = path.join("src", "uploads", "pdfs", pdf.filename);
        fs.unlink(pdfPath, () => {});
      }
    });
  });

  await course.deleteOne();
  // Cleanup notifications related to this course
  await Notification.deleteMany({ courseName });
  res.status(200).json({ message: "Course deleted successfully" });
});

// @desc Delete section from course (admin only)
export const deleteSection = asyncHandler(async (req, res) => {
  const { courseName, sectionId } = req.body;

  if (!courseName || !sectionId) {
    return res
      .status(400)
      .json({ message: "Course name and section ID are required" });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Check if user is the creator or admin
  if (
    course.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin" &&
    req.user.role !== "superadmin"
  ) {
    return res
      .status(403)
      .json({ message: "Not authorized to modify this course" });
  }

  // Find the section to delete
  const sectionIndex = course.sections.findIndex(
    (section) => section._id.toString() === sectionId
  );
  if (sectionIndex === -1) {
    return res.status(404).json({ message: "Section not found" });
  }

  const sectionToDelete = course.sections[sectionIndex];

  // Delete associated files
  // Delete videos
  sectionToDelete.videos.forEach((video) => {
    if (video.filename) {
      const videoPath = path.join("src", "uploads", "videos", video.filename);
      fs.unlink(videoPath, () => {});
    }
  });

  // Delete PDFs
  sectionToDelete.pdfs.forEach((pdf) => {
    if (pdf.filename) {
      const pdfPath = path.join("src", "uploads", "pdfs", pdf.filename);
      fs.unlink(pdfPath, () => {});
    }
  });

  // Remove the section from the course
  course.sections.splice(sectionIndex, 1);
  await course.save();

  res.status(200).json({
    message: "Section deleted successfully",
    course: course,
  });
});

// @desc Get my notifications
export const getMyNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  // Find courses the user is enrolled in
  const enrolledCourses = await Course.find(
    { lockedFor: userId, published: true },
    "name"
  );
  const courseNames = enrolledCourses.map((c) => c.name);

  // Fetch notifications either directly targeted to the userId
  // or belonging to courses the user is enrolled in
  const notifications = await Notification.find({
    $or: [
      // Course-related notifications must be for published courses the user is enrolled in
      { courseName: { $in: courseNames } },
      // Non-course notifications (no courseName) targeted to the user
      { userId, courseName: { $exists: false } },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json(notifications);
});

// @desc Get students enrolled (unlocked) in a course
export const getStudentsInCourse = asyncHandler(async (req, res) => {
  const { courseName } = req.body;

  if (!courseName) {
    return res.status(400).json({ message: "Course name is required" });
  }

  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const students = await User.find({
    _id: { $in: course.lockedFor },
    role: "student",
  }).select("-password -__v");

  if (!students.length) {
    return res
      .status(404)
      .json({ message: "No students found for this course" });
  }

  const imageBaseUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/uploads/images/`;

  const formattedStudents = students.map((student) => ({
    _id: student._id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    role: student.role,
    cardImage: student.cardImage || null,
    imageUrl: student.cardImage ? imageBaseUrl + student.cardImage : null,
  }));

  res
    .status(200)
    .json({ count: formattedStudents.length, students: formattedStudents });
});
