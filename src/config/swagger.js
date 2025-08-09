import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Courses Platform API",
      version: "1.0.0",
      description: `
        📚 **Educational Courses Management Platform**
        
        This is a comprehensive platform for managing educational courses that includes:
        
        ## ✨ **Key Features:**
        - 🔐 Complete authentication system (register, login, logout)
        - 👥 User management (students and admins)
        - 📖 Course and section management
        - 🎥 Automatic video upload and compression
        - 📄 PDF file upload with download control
        - 🔒 Session protection system for students
        - 📧 Password reset via email
        - 🚀 Automatic video compression to save storage
        
        ## 👤 **User Types:**
        - **Admin**: Can create and manage courses, open them for students
        - **Student**: Can access only courses opened for them
        
        ## 🔧 **Technologies Used:**
        - Node.js & Express.js
        - MongoDB & Mongoose
        - JWT Authentication
        - Multer for file uploads
        - FFmpeg for video processing
        - Nodemailer for email services
      `,
      contact: {
        name: "API Support",
        email: "support@coursesplatform.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/api/v1",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token in format: Bearer <token>",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: [
            "fullName",
            "email",
            "phone",
            "password",
            "year",
            "departmentType",
            "university",
          ],
          properties: {
            _id: {
              type: "string",
              description: "Unique user identifier",
              example: "507f1f77bcf86cd799439011",
            },
            fullName: {
              type: "string",
              description: "Full name of the user",
              example: "Ahmed Mohamed Ali",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email address (must be unique)",
              example: "ahmed@example.com",
            },
            phone: {
              type: "string",
              description: "Phone number (must be unique)",
              example: "+201234567890",
            },
            year: {
              type: "number",
              description: "Academic year",
              example: 3,
            },
            departmentType: {
              type: "string",
              enum: ["public", "private"],
              description: "Department type",
              example: "public",
            },
            university: {
              type: "string",
              description: "University name",
              example: "Cairo University",
            },
            role: {
              type: "string",
              enum: ["student", "admin"],
              default: "student",
              description: "User role in the system",
            },
            isLoggedIn: {
              type: "boolean",
              default: false,
              description: "Student login status (for students only)",
            },
            cardImage: {
              type: "string",
              description:
                "University card image filename (required for students)",
              example: "card-1640995200000.jpg",
            },
          },
        },
        Course: {
          type: "object",
          required: ["name", "teacher", "price"],
          properties: {
            _id: {
              type: "string",
              description: "Unique course identifier",
            },
            name: {
              type: "string",
              description: "Course name",
              example: "Advanced Programming Course",
            },
            teacher: {
              type: "string",
              description: "Teacher name",
              example: "Dr. Ahmed Mohamed",
            },
            followGroup: {
              type: "string",
              description: "Follow-up group link",
              example: "https://t.me/programming_group",
            },
            price: {
              type: "number",
              description: "Course price",
              example: 500,
            },
            whatsappNumber: {
              type: "string",
              description: "WhatsApp number for contact",
              example: "+201234567890",
            },
            image: {
              type: "string",
              description: "Course image",
            },
            createdBy: {
              type: "string",
              description: "Course creator identifier",
            },
            sections: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Section",
              },
            },
            lockedFor: {
              type: "array",
              items: {
                type: "string",
              },
              description: "List of student IDs allowed to access",
            },
          },
        },
        Section: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Unique section identifier",
            },
            title: {
              type: "string",
              description: "Section title",
              example: "Lesson 1 - Introduction",
            },
            videos: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Video",
              },
            },
            pdfs: {
              type: "array",
              items: {
                $ref: "#/components/schemas/PDF",
              },
            },
          },
        },
        Video: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Unique video identifier",
            },
            label: {
              type: "string",
              description: "Video label",
              example: "Introduction to Programming",
            },
            filename: {
              type: "string",
              description: "Compressed video filename",
              example: "video-1640995200000.mp4",
            },
            url: {
              type: "string",
              description: "Video URL",
              example:
                "http://localhost:3000/api/v1/uploads/videos/video-1640995200000.mp4",
            },
          },
        },
        PDF: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Unique PDF identifier",
            },
            label: {
              type: "string",
              description: "PDF label",
              example: "Lesson Summary",
            },
            filename: {
              type: "string",
              description: "PDF filename",
              example: "pdf-1640995200000.pdf",
            },
            url: {
              type: "string",
              description: "PDF URL",
              example:
                "http://localhost:3000/api/v1/uploads/pdfs/pdf-1640995200000.pdf",
            },
            downloadable: {
              type: "boolean",
              description: "Whether the file is downloadable or not",
              example: true,
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message",
            },
            status: {
              type: "number",
              description: "HTTP status code",
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Success message",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description:
          "🔐 **Authentication and Registration System**\n\nAll APIs related to user registration, login/logout, and password management.",
      },
      {
        name: "Courses",
        description:
          "📚 **Course Management**\n\nAll APIs related to creating, editing, and deleting courses, adding sections, and uploading files.",
      },
      {
        name: "Users",
        description:
          "👥 **User Management**\n\nAll APIs related to managing users and students.",
      },
      {
        name: "Notifications",
        description:
          "🔔 **Notification System**\n\nAll APIs related to user notifications and messaging.",
      },
      {
        name: "Admin Only",
        description:
          "⚡ **Admin Only**\n\nAPIs accessible only by administrators.",
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js", "./src/models/*.js"],
};

const specs = swaggerJSDoc(options);

export { specs, swaggerUi };
