/**
 * API ENDPOINTS DOCUMENTATION
 *
 * All image-related API endpoints for student image management
 */

// ============================================
// 1. UPLOAD OR REPLACE STUDENT IMAGE
// ============================================

/**
 * POST /api/students/:id/upload-image
 *
 * Upload or replace a student's image to Supabase Storage
 *
 * Request:
 * - Method: POST
 * - Content-Type: multipart/form-data
 * - Header: Authorization: Bearer <token>
 * - Body: FormData with 'image' field
 *
 * Parameters:
 * - id: Student ID (number)
 *
 * Example Request:
 * curl -X POST http://localhost:3000/api/students/1/upload-image \
 *   -H "Authorization: Bearer your-token" \
 *   -F "image=@/path/to/image.jpg"
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "message": "Image uploaded successfully",
 *   "student": {
 *     "id": 1,
 *     "name": "أحمد محمد",
 *     "image_url": "https://...",
 *     "image_upload_date": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 *
 * Error Response (400/500):
 * {
 *   "success": false,
 *   "error": "Error message"
 * }
 *
 * File Requirements:
 * - Supported formats: JPEG, PNG, GIF, WebP
 * - Max file size: 5MB
 * - Required: File must be provided
 *
 * What happens:
 * 1. Validates the file (type, size)
 * 2. Checks if student exists
 * 3. Deletes old image if it exists
 * 4. Uploads new image to Supabase Storage
 * 5. Gets public URL
 * 6. Updates database with new image_url
 * 7. Returns updated student data
 */

// ============================================
// 2. DELETE STUDENT IMAGE
// ============================================

/**
 * DELETE /api/students/:id/image
 *
 * Delete student's image from Supabase Storage and database
 *
 * Request:
 * - Method: DELETE
 * - Header: Authorization: Bearer <token>
 *
 * Parameters:
 * - id: Student ID (number)
 *
 * Example Request:
 * curl -X DELETE http://localhost:3000/api/students/1/image \
 *   -H "Authorization: Bearer your-token"
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "message": "Image deleted successfully",
 *   "student": {
 *     "id": 1,
 *     "name": "أحمد محمد",
 *     "image_url": null
 *   }
 * }
 *
 * Error Response (404/500):
 * {
 *   "success": false,
 *   "error": "Error message"
 * }
 *
 * What happens:
 * 1. Gets student's current image_url
 * 2. Extracts storage path from URL
 * 3. Deletes image from Supabase Storage
 * 4. Updates database (sets image_url to NULL)
 * 5. Returns updated student data
 */

// ============================================
// 3. GET STUDENT IMAGE INFO
// ============================================

/**
 * GET /api/students/:id/image
 *
 * Get student's image URL and upload date info
 *
 * Request:
 * - Method: GET
 * - Header: Authorization: Bearer <token>
 *
 * Parameters:
 * - id: Student ID (number)
 *
 * Example Request:
 * curl http://localhost:3000/api/students/1/image \
 *   -H "Authorization: Bearer your-token"
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "student": {
 *     "id": 1,
 *     "name": "أحمد محمد",
 *     "image_url": "https://...",
 *     "image_upload_date": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 *
 * Error Response (404):
 * {
 *   "success": false,
 *   "error": "Student not found"
 * }
 *
 * What happens:
 * 1. Fetches student from database
 * 2. Returns image_url and upload date
 * 3. Returns null if no image exists
 */

// ============================================
// 4. MIGRATION SCRIPT
// ============================================

/**
 * Migrate old Base64 images to Supabase Storage
 *
 * Command:
 * node scripts/migrate-photos-to-storage.js
 *
 * Prerequisites:
 * - SUPABASE_URL in .env
 * - SUPABASE_KEY in .env
 * - DATABASE_URL in .env
 * - "images" bucket created in Supabase Storage
 * - image_url column added to students table (migration 001)
 *
 * What it does:
 * 1. Connects to database
 * 2. Finds all students with photo_data (Base64)
 * 3. For each student:
 *    a. Converts Base64 to buffer
 *    b. Uploads to Supabase Storage
 *    c. Gets public URL
 *    d. Updates database with image_url
 * 4. Logs all operations to migration-*.log
 * 5. Does NOT delete old photo_data (manual verification first)
 *
 * Output:
 * - migration-1234567890.log file with report
 * - Console output during execution
 *
 * Next Steps After Migration:
 * 1. Review the log file for errors
 * 2. Manually verify a few records
 * 3. If all looks good, delete photo_data column:
 *    ALTER TABLE students DROP COLUMN photo_data;
 * 4. Remove old photo_data references from code
 */

// ============================================
// 5. SERVICE METHODS
// ============================================

/**
 * imageService.uploadStudentImage(file, studentId)
 *
 * Upload image file to storage
 *
 * Parameters:
 * - file: Express file object (req.file from multer)
 * - studentId: Student ID
 *
 * Returns:
 * {
 *   success: true,
 *   fileName: "student-1-1705326600000.jpg",
 *   storagePath: "students/student-1-1705326600000.jpg",
 *   publicUrl: "https://..."
 * }
 *
 * Or on error:
 * {
 *   success: false,
 *   error: "Error message"
 * }
 */

/**
 * imageService.deleteImage(storagePath)
 *
 * Delete image from storage
 *
 * Parameters:
 * - storagePath: Path to image (e.g., "students/student-1.jpg")
 *
 * Returns:
 * {
 *   success: true
 * }
 *
 * Or on error:
 * {
 *   success: false,
 *   error: "Error message"
 * }
 */

/**
 * imageService.replaceImage(file, studentId, oldStoragePath)
 *
 * Replace student's image (delete old, upload new)
 *
 * Parameters:
 * - file: Express file object
 * - studentId: Student ID
 * - oldStoragePath: Path to old image
 *
 * Returns: Same as uploadStudentImage
 */

/**
 * imageService.validateImage(file)
 *
 * Validate image file
 *
 * Parameters:
 * - file: Express file object
 *
 * Returns:
 * {
 *   valid: true
 * }
 *
 * Or on error:
 * {
 *   valid: false,
 *   errors: ["Error 1", "Error 2"]
 * }
 */

// ============================================
// 6. ERROR HANDLING
// ============================================

/**
 * Common HTTP Status Codes:
 *
 * 200 OK
 * - Request successful
 *
 * 400 Bad Request
 * - No file provided
 * - Invalid file type or size
 * - Student not found
 *
 * 404 Not Found
 * - Student doesn't exist
 * - Image not found
 *
 * 500 Internal Server Error
 * - Database error
 * - Storage service error
 * - Unexpected error
 */

// ============================================
// 7. FRONTEND INTEGRATION EXAMPLE
// ============================================

/**
 * JavaScript (Vanilla)
 */

async function uploadStudentImage(studentId, file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`/api/students/${studentId}/upload-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (data.success) {
    console.log("Image uploaded:", data.student.image_url);
    return data.student.image_url;
  } else {
    throw new Error(data.error);
  }
}

/**
 * jQuery
 */

function uploadImage(studentId, file) {
  const formData = new FormData();
  formData.append("image", file);

  return $.ajax({
    url: `/api/students/${studentId}/upload-image`,
    method: "POST",
    data: formData,
    processData: false,
    contentType: false,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    success: function (response) {
      console.log("Image uploaded:", response.student.image_url);
    },
    error: function (xhr) {
      console.error("Error:", xhr.responseJSON.error);
    },
  });
}

/**
 * React Hook
 */

function useStudentImageUpload(studentId) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const uploadImage = async (file) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await axios.post(
        `/api/students/${studentId}/upload-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      return response.data.student.image_url;
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Upload failed";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { uploadImage, loading, error };
}

// ============================================
// 8. TESTING WITH CURL
// ============================================

/**
 * Test image upload:
 *
 * curl -X POST http://localhost:3000/api/students/1/upload-image \
 *   -H "Authorization: Bearer your-token" \
 *   -F "image=@/path/to/image.jpg"
 *
 * Test get image:
 *
 * curl http://localhost:3000/api/students/1/image \
 *   -H "Authorization: Bearer your-token"
 *
 * Test delete image:
 *
 * curl -X DELETE http://localhost:3000/api/students/1/image \
 *   -H "Authorization: Bearer your-token"
 */

// ============================================
// END OF DOCUMENTATION
// ============================================
