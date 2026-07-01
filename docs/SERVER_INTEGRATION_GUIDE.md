/\*\*

- Server.js Integration Guide
-
- Add these code sections to your existing server.js
  \*/

// ============================================
// 1. ADD IMPORTS AT THE TOP
// ============================================

// Add this near other imports:
const multer = require("multer");
const imageService = require("./services/imageService");
const studentImageRoutes = require("./routes/studentImageRoutes");

// ============================================
// 2. ADD STUDENT IMAGE ROUTES
// ============================================

// Add this after other route definitions (around line 400-500):
app.use("/api/students", studentImageRoutes);

// ============================================
// 3. HANDLE IMAGE DELETION WHEN STUDENT IS DELETED
// ============================================

// Find your student DELETE endpoint and replace it with this version:

// DELETE student
app.delete("/api/students/:id", authenticateToken, checkPermission("students", "delete"), async (req, res) => {
const client = await pool.connect();
try {
await client.query("BEGIN");

    // Get student image_url before deletion
    const studentResult = await client.query(
      "SELECT id, image_url FROM students WHERE id = $1",
      [req.params.id]
    );

    if (studentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentResult.rows[0];

    // Delete image from storage if it exists
    if (student.image_url) {
      const deleteResult = await imageService.deleteImage(
        extractStoragePath(student.image_url)
      );

      if (!deleteResult.success) {
        console.warn(`Warning: Failed to delete image for student ${student.id}`);
        // Continue anyway, don't fail the student deletion
      }
    }

    // Delete student record
    await client.query(
      "DELETE FROM students WHERE id = $1",
      [req.params.id]
    );

    await client.query("COMMIT");
    res.json({ message: "Student deleted successfully" });

} catch (error) {
await client.query("ROLLBACK");
console.error("Delete student error:", error);
res.status(500).json({ error: "Failed to delete student" });
} finally {
client.release();
}
});

// Helper function to extract storage path from public URL
function extractStoragePath(publicUrl) {
if (!publicUrl) return null;

// URL format: https://[project].supabase.co/storage/v1/object/public/images/students/...
const match = publicUrl.match(/\/storage\/v1\/object\/public\/(.+)$/);
return match ? match[1] : null;
}

// ============================================
// 4. HANDLE IMAGE WHEN UPDATING STUDENT
// ============================================

// If you have an endpoint that allows updating student with new image,
// make sure it uses the studentImageRoutes for image handling

// Example: Use the POST /api/students/:id/upload-image endpoint
// for updating student image, not the regular UPDATE endpoint

// ============================================
// 5. BULK DELETE STUDENTS
// ============================================

// If you have bulk delete functionality, handle images there too:

app.post("/api/students/bulk-delete", authenticateToken, checkPermission("students", "delete"), async (req, res) => {
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
      [ids]
    );

    // Delete images from storage
    for (const student of studentsResult.rows) {
      if (student.image_url) {
        const deleteResult = await imageService.deleteImage(
          extractStoragePath(student.image_url)
        );

        if (!deleteResult.success) {
          console.warn(`Warning: Failed to delete image for student ${student.id}`);
        }
      }
    }

    // Delete all student records
    await client.query(
      "DELETE FROM students WHERE id = ANY($1)",
      [ids]
    );

    await client.query("COMMIT");
    res.json({
      message: `${ids.length} students deleted successfully`,
      deletedCount: ids.length
    });

} catch (error) {
await client.query("ROLLBACK");
console.error("Bulk delete error:", error);
res.status(500).json({ error: "Failed to delete students" });
} finally {
client.release();
}
});

// ============================================
// 6. VERIFY BUCKET EXISTS
// ============================================

// Add this after Supabase client initialization:

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_KEY
);

// Optional: Test storage connection on startup
async function verifyStorageSetup() {
try {
const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("Storage error:", error);
      return;
    }

    const imageBucketExists = data.some(b => b.name === "images");

    if (!imageBucketExists) {
      console.warn(
        "⚠️  'images' bucket not found. " +
        "Create it in Supabase Dashboard or using CLI: " +
        "supabase storage create-bucket images --public"
      );
    } else {
      console.log("✓ Storage bucket 'images' verified");
    }

} catch (error) {
console.error("Failed to verify storage setup:", error);
}
}

// Call on server start:
verifyStorageSetup();

// ============================================
// 7. ADD ERROR HANDLING FOR MULTER
// ============================================

app.use((error, req, res, next) => {
if (error instanceof multer.MulterError) {
if (error.code === "FILE_TOO_LARGE") {
return res.status(400).json({
success: false,
error: "File size exceeds 5MB limit",
});
}
}

if (error.message && error.message.includes("Invalid file type")) {
return res.status(400).json({
success: false,
error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP",
});
}

next(error);
});

// ============================================
// END OF INTEGRATION SECTIONS
// ============================================
