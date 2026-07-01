/**
 * Student Image Routes
 *
 * Endpoints:
 * - POST /api/students/:id/upload-image - Upload/replace student image
 * - DELETE /api/students/:id/image - Delete student image
 * - GET /api/students/:id/image - Get student image URL
 */

const express = require("express");
const multer = require("multer");
const router = express.Router();
const imageService = require("../services/imageService");
const { Pool } = require("pg");

// Setup multer for file upload (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

/**
 * Helper: Get student current image path
 */
async function getStudentImagePath(studentId) {
  try {
    const result = await pool.query(
      "SELECT image_url FROM students WHERE id = $1",
      [studentId],
    );

    if (result.rows.length === 0) return null;

    const publicUrl = result.rows[0].image_url;
    // Extract storage path from public URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/images/students/...
    if (publicUrl && publicUrl.includes("/storage/v1/object/public/images/")) {
      const path = publicUrl.split("/storage/v1/object/public/images/")[1];
      return `images/${path}`;
    }
    return null;
  } catch (error) {
    console.error("Error getting student image path:", error);
    return null;
  }
}

/**
 * Upload or replace student image
 * POST /api/students/:id/upload-image
 */
router.post("/:id/upload-image", upload.single("image"), async (req, res) => {
  try {
    const studentId = req.params.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    // Get current image path
    const oldImagePath = await getStudentImagePath(studentId);

    // Upload or replace image
    const uploadResult = await imageService.replaceImage(
      req.file,
      studentId,
      oldImagePath,
    );

    if (!uploadResult.success) {
      return res.status(400).json({
        success: false,
        error: uploadResult.error,
      });
    }

    // Update database
    const updateQuery = `
      UPDATE students 
      SET image_url = $1, image_upload_date = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, image_url, image_upload_date;
    `;

    const dbResult = await pool.query(updateQuery, [
      uploadResult.publicUrl,
      studentId,
    ]);

    if (dbResult.rows.length === 0) {
      // Cleanup: delete the uploaded image since student doesn't exist
      await imageService.deleteImage(uploadResult.storagePath);
      return res.status(404).json({
        success: false,
        error: "Student not found",
      });
    }

    res.json({
      success: true,
      message: "Image uploaded successfully",
      student: dbResult.rows[0],
    });
  } catch (error) {
    console.error("Upload image error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Delete student image
 * DELETE /api/students/:id/image
 */
router.delete("/:id/image", async (req, res) => {
  try {
    const studentId = req.params.id;

    // Get current image path
    const imagePath = await getStudentImagePath(studentId);

    if (!imagePath) {
      return res.status(404).json({
        success: false,
        error: "No image found for this student",
      });
    }

    // Delete from storage
    const deleteResult = await imageService.deleteImage(imagePath);

    if (!deleteResult.success) {
      return res.status(400).json({
        success: false,
        error: deleteResult.error,
      });
    }

    // Update database - clear image_url
    const updateQuery = `
      UPDATE students 
      SET image_url = NULL, image_upload_date = NULL
      WHERE id = $1
      RETURNING id, name, image_url;
    `;

    const dbResult = await pool.query(updateQuery, [studentId]);

    if (dbResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Student not found",
      });
    }

    res.json({
      success: true,
      message: "Image deleted successfully",
      student: dbResult.rows[0],
    });
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get student image URL
 * GET /api/students/:id/image
 */
router.get("/:id/image", async (req, res) => {
  try {
    const studentId = req.params.id;

    const result = await pool.query(
      "SELECT id, name, image_url, image_upload_date FROM students WHERE id = $1",
      [studentId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Student not found",
      });
    }

    const student = result.rows[0];

    res.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        image_url: student.image_url,
        image_upload_date: student.image_upload_date,
      },
    });
  } catch (error) {
    console.error("Get image error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
