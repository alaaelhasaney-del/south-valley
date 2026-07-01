/**
 * READY-TO-USE CODE FOR server.js
 *
 * Copy and paste the relevant sections from this file into your server.js
 *
 * ============================================
 * SECTION 1: IMPORTS (Add at the top)
 * ============================================
 */

// Add these with your other requires (around line 1-10)
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const imageService = require("./services/imageService");
const studentImageRoutes = require("./routes/studentImageRoutes");

// Initialize Supabase (add after Pool initialization)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

/**
 * ============================================
 * SECTION 2: HELPER FUNCTION (Add after imports)
 * ============================================
 */

function extractStoragePath(publicUrl) {
  if (!publicUrl) return null;
  // URL format: https://[project].supabase.co/storage/v1/object/public/images/students/...
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * ============================================
 * SECTION 3: VERIFY STORAGE SETUP (Add after server initialization)
 * ============================================
 */

// Add this after your pool setup, before route definitions
async function verifyStorageSetup() {
  try {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("⚠️  Storage connection error:", error);
      return;
    }

    const imageBucketExists = data.some((b) => b.name === "images");

    if (!imageBucketExists) {
      console.warn(
        "\n⚠️  WARNING: 'images' bucket not found in Supabase Storage",
      );
      console.warn("Create it using:");
      console.warn("  Option 1: Supabase Dashboard → Storage → Create Bucket");
      console.warn(
        "  Option 2: supabase storage create-bucket images --public\n",
      );
    } else {
      console.log("✓ Storage bucket 'images' verified");
    }
  } catch (error) {
    console.error("Failed to verify storage setup:", error);
  }
}

// Call on startup (add in your main server initialization)
verifyStorageSetup();

/**
 * ============================================
 * SECTION 4: STUDENT IMAGE ROUTES (Add with other routes)
 * ============================================
 */

// Add this after your other route definitions (around line 300-400)
app.use("/api/students", studentImageRoutes);

/**
 * ============================================
 * SECTION 5: DELETE STUDENT WITH IMAGE CLEANUP
 * ============================================
 */

// REPLACE your existing DELETE /api/students/:id route with this:

app.delete(
  "/api/students/:id",
  authenticateToken,
  checkPermission("students", "delete"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get student image_url before deletion
      const studentResult = await client.query(
        "SELECT id, image_url FROM students WHERE id = $1",
        [req.params.id],
      );

      if (studentResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Student not found" });
      }

      const student = studentResult.rows[0];

      // Delete image from storage if it exists
      if (student.image_url) {
        const storagePath = extractStoragePath(student.image_url);
        if (storagePath) {
          const deleteResult = await imageService.deleteImage(storagePath);

          if (!deleteResult.success) {
            console.warn(
              `Warning: Failed to delete image for student ${student.id}: ${deleteResult.error}`,
            );
            // Continue anyway, don't fail the student deletion
          }
        }
      }

      // Delete student record
      await client.query("DELETE FROM students WHERE id = $1", [req.params.id]);

      await client.query("COMMIT");
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Delete student error:", error);
      res.status(500).json({ error: "Failed to delete student" });
    } finally {
      client.release();
    }
  },
);

/**
 * ============================================
 * SECTION 6: BULK DELETE STUDENTS (OPTIONAL)
 * ============================================
 */

// Add this if you have bulk operations
app.post(
  "/api/students/bulk-delete",
  authenticateToken,
  checkPermission("students", "delete"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No student IDs provided" });
      }

      // Get all images for these students
      const studentsResult = await client.query(
        "SELECT id, image_url FROM students WHERE id = ANY($1)",
        [ids],
      );

      // Delete images from storage
      for (const student of studentsResult.rows) {
        if (student.image_url) {
          const storagePath = extractStoragePath(student.image_url);
          if (storagePath) {
            const deleteResult = await imageService.deleteImage(storagePath);

            if (!deleteResult.success) {
              console.warn(
                `Warning: Failed to delete image for student ${student.id}`,
              );
            }
          }
        }
      }

      // Delete all student records
      await client.query("DELETE FROM students WHERE id = ANY($1)", [ids]);

      await client.query("COMMIT");
      res.json({
        message: `${ids.length} students deleted successfully`,
        deletedCount: ids.length,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Bulk delete error:", error);
      res.status(500).json({ error: "Failed to delete students" });
    } finally {
      client.release();
    }
  },
);

/**
 * ============================================
 * SECTION 7: ERROR HANDLING MIDDLEWARE
 * ============================================
 */

// Add this BEFORE app.listen() - it should be one of the last middleware

app.use((error, req, res, next) => {
  // Handle multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === "FILE_TOO_LARGE") {
      return res.status(400).json({
        success: false,
        error: "File size exceeds 5MB limit",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: "Too many files",
      });
    }
  }

  // Handle custom validation errors
  if (error.message && error.message.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP",
    });
  }

  // Pass to next error handler
  next(error);
});

/**
 * ============================================
 * SECTION 8: ENVIRONMENT CHECK (OPTIONAL)
 * ============================================
 */

// Add this on startup to verify environment setup
function checkEnvironment() {
  const required = ["SUPABASE_URL", "SUPABASE_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(", ")}`);
    console.warn("Image upload will not work. Add to .env:");
    missing.forEach((key) => {
      console.warn(`  ${key}=...`);
    });
  }
}

checkEnvironment();

/**
 * ============================================
 * SECTION 9: COMPLETE EXAMPLE server.js STRUCTURE
 * ============================================
 */

/*
// Your complete server.js should look like this (simplified):

const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

// SECTION 1: IMPORTS
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const imageService = require("./services/imageService");
const studentImageRoutes = require("./routes/studentImageRoutes");

const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// SECTION 2: Helper functions
function extractStoragePath(publicUrl) {
  if (!publicUrl) return null;
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/(.+)$/);
  return match ? match[1] : null;
}

// SECTION 3: Verify storage
async function verifyStorageSetup() {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("Storage error:", error);
      return;
    }
    const imageBucketExists = data.some((b) => b.name === "images");
    if (!imageBucketExists) {
      console.warn("⚠️  'images' bucket not found. Create it in Supabase Dashboard.");
    } else {
      console.log("✓ Storage verified");
    }
  } catch (error) {
    console.error("Storage verification failed:", error);
  }
}

verifyStorageSetup();

// EXISTING ROUTES HERE (login, CRUD operations, etc.)

// SECTION 4: Student Image Routes
app.use("/api/students", studentImageRoutes);

// SECTION 5: Delete student with image cleanup
app.delete("/api/students/:id", authenticateToken, checkPermission("students", "delete"), async (req, res) => {
  // ... (see SECTION 5 code above)
});

// SECTION 7: Error handling
app.use((error, req, res, next) => {
  // ... (see SECTION 7 code above)
});

// SECTION 8: Environment check
function checkEnvironment() {
  // ... (see SECTION 8 code above)
}

checkEnvironment();

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
*/

/**
 * ============================================
 * TESTING THE IMPLEMENTATION
 * ============================================
 */

/*
After integration, test with curl:

1. Upload an image:
curl -X POST http://localhost:3000/api/students/1/upload-image \
  -H "Authorization: Bearer your-token" \
  -F "image=@/path/to/image.jpg"

2. Get image info:
curl http://localhost:3000/api/students/1/image \
  -H "Authorization: Bearer your-token"

3. Delete image:
curl -X DELETE http://localhost:3000/api/students/1/image \
  -H "Authorization: Bearer your-token"

4. Run migration (if you have old Base64 images):
node scripts/migrate-photos-to-storage.js
*/

// ============================================
// END OF READY-TO-USE CODE
// ============================================
