/**
 * Migration Script: Move photos from Base64 to Supabase Storage
 *
 * This script:
 * 1. Reads all students with photo_data from database
 * 2. Converts Base64 to image files
 * 3. Uploads to Supabase Storage
 * 4. Updates database with storage URLs
 * 5. Logs all operations
 */

const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ override: true });

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_KEY;
const supabaseKey = serviceRoleKey || anonKey;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseKey || !databaseUrl) {
  console.error(
    "Missing required environment variables. Please ensure .env contains SUPABASE_URL, DATABASE_URL, and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY.",
  );
  console.error("Current values:");
  console.error(`  SUPABASE_URL=${supabaseUrl ? "set" : "unset"}`);
  console.error(
    `  SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey ? "set" : "unset"}`,
  );
  console.error(`  SUPABASE_KEY=${anonKey ? "set" : "unset"}`);
  console.error(`  DATABASE_URL=${databaseUrl ? "set" : "unset"}`);
  process.exit(1);
}

if (serviceRoleKey) {
  console.log("Using SUPABASE_SERVICE_ROLE_KEY for storage migration.");
} else {
  console.log(
    "Warning: using SUPABASE_KEY instead of service role key. This may fail if storage row-level security is enabled.",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Logging setup
const logFile = path.join(__dirname, `migration-${Date.now()}.log`);
const successLog = [];
const errorLog = [];

function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;

  console.log(logMessage);

  if (type === "error") {
    errorLog.push(logMessage);
  } else {
    successLog.push(logMessage);
  }
}

function writeLogs() {
  const report = `
=====================================
MIGRATION REPORT
=====================================
Generated: ${new Date().toISOString()}

SUMMARY:
========
Total Successful: ${successLog.length}
Total Errors: ${errorLog.length}

SUCCESSFUL MIGRATIONS:
=====================
${successLog.join("\n")}

ERRORS:
=======
${errorLog.length > 0 ? errorLog.join("\n") : "No errors"}

====================================
  `;

  fs.writeFileSync(logFile, report);
  console.log(`\n✓ Migration report saved to: ${logFile}`);
}

/**
 * Convert Base64 string to Buffer
 */
function base64ToBuffer(base64String) {
  try {
    // Remove data URI prefix if present (e.g., "data:image/png;base64,")
    const cleanBase64 = base64String.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(cleanBase64, "base64");
  } catch (error) {
    throw new Error(`Failed to convert Base64 to Buffer: ${error.message}`);
  }
}

/**
 * Detect image type from Base64 header
 */
function detectImageType(base64String) {
  if (base64String.includes("data:image/jpeg")) return "jpg";
  if (base64String.includes("data:image/png")) return "png";
  if (base64String.includes("data:image/gif")) return "gif";
  if (base64String.includes("data:image/webp")) return "webp";

  // Check magic bytes
  const buffer = Buffer.from(
    base64String.split(",")[1] || base64String,
    "base64",
  );
  const hex = buffer.toString("hex", 0, 4);

  if (hex.startsWith("ffd8ff")) return "jpg";
  if (hex.startsWith("89504e47")) return "png";
  if (hex.startsWith("47494638")) return "gif";
  if (hex.startsWith("52494646")) return "webp";

  return "jpg"; // Default to jpg
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToStorage(studentId, base64Data, photoData) {
  try {
    const imageType = detectImageType(photoData);
    const fileName = `student-${studentId}-${Date.now()}.${imageType}`;
    const fileBuffer = base64ToBuffer(photoData);

    log(`Uploading image for student ${studentId}: ${fileName}`);

    const { data, error } = await supabase.storage
      .from("images")
      .upload(`students/${fileName}`, fileBuffer, {
        contentType: `image/${imageType}`,
        upsert: false,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("images")
      .getPublicUrl(`students/${fileName}`);

    const publicUrl = urlData.publicUrl;
    log(`✓ Successfully uploaded image for student ${studentId}: ${publicUrl}`);

    return {
      success: true,
      fileName,
      publicUrl,
      storagePath: `students/${fileName}`,
    };
  } catch (error) {
    log(
      `✗ Failed to upload image for student ${studentId}: ${error.message}`,
      "error",
    );
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update student record with new image URL
 */
async function updateStudentImageUrl(studentId, imageUrl) {
  try {
    const query = `
      UPDATE students 
      SET image_url = $1, image_upload_date = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, image_url;
    `;

    const result = await pool.query(query, [imageUrl, studentId]);

    if (result.rows.length === 0) {
      throw new Error(`Student ${studentId} not found`);
    }

    log(`✓ Updated database for student ${studentId} (${result.rows[0].name})`);
    return true;
  } catch (error) {
    log(
      `✗ Failed to update database for student ${studentId}: ${error.message}`,
      "error",
    );
    return false;
  }
}

/**
 * Main migration function
 */
async function migratePhotos() {
  try {
    log("=".repeat(50));
    log("Starting photo migration process...");
    log("=".repeat(50));

    // Get all students with photo_data
    const query = `
      SELECT id, name, photo_data
      FROM students
      WHERE photo_data IS NOT NULL 
        AND photo_data != ''
        AND (image_url IS NULL OR image_url = '')
      ORDER BY id ASC;
    `;

    const result = await pool.query(query);
    const students = result.rows;

    if (students.length === 0) {
      log("No students with photo data found. Migration complete.");
      writeLogs();
      await pool.end();
      process.exit(0);
    }

    log(`Found ${students.length} students with photos to migrate`);
    log("-".repeat(50));

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Process each student
    for (const student of students) {
      try {
        const { id, name, photo_data } = student;

        if (!photo_data || photo_data.trim() === "") {
          log(`Skipping student ${id} (${name}): No photo data`, "warn");
          skipCount++;
          continue;
        }

        // Upload to storage
        const uploadResult = await uploadToStorage(id, photo_data, photo_data);

        if (!uploadResult.success) {
          errorCount++;
          continue;
        }

        // Update database
        const updateSuccess = await updateStudentImageUrl(
          id,
          uploadResult.publicUrl,
        );

        if (updateSuccess) {
          successCount++;
        } else {
          errorCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        log(`Unexpected error processing student: ${error.message}`, "error");
        errorCount++;
      }
    }

    log("-".repeat(50));
    log(`Migration Summary:`);
    log(`  ✓ Successful: ${successCount}`);
    log(`  ⊘ Skipped: ${skipCount}`);
    log(`  ✗ Errors: ${errorCount}`);
    log("=".repeat(50));

    writeLogs();
  } catch (error) {
    log(`Critical error in migration: ${error.message}`, "error");
    writeLogs();
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migratePhotos();

process.on("SIGINT", async () => {
  log("Migration interrupted by user", "warn");
  writeLogs();
  await pool.end();
  process.exit(1);
});
