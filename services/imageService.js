/**
 * Image Service
 *
 * Handles all image operations:
 * - Upload images to Supabase Storage
 * - Delete images from storage
 * - Update images
 * - Validation
 */

const { createClient } = require("@supabase/supabase-js");

class ImageService {
  constructor() {
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    this.supabase = createClient(process.env.SUPABASE_URL, serviceKey);
    this.bucketName = "images";
    this.studentFolder = "students";

    // Configuration
    this.config = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      allowedExtensions: ["jpg", "jpeg", "png", "gif", "webp"],
    };
  }

  /**
   * Validate image file
   */
  validateImage(file) {
    const errors = [];

    // Check if file exists
    if (!file) {
      errors.push("No file provided");
      return { valid: false, errors };
    }

    // Check file size
    if (file.size > this.config.maxFileSize) {
      errors.push(
        `File size exceeds limit. Max: ${this.config.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check file type
    if (!this.config.allowedTypes.includes(file.mimetype)) {
      errors.push(
        `Invalid file type. Allowed: ${this.config.allowedExtensions.join(", ")}`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate unique filename
   */
  generateFileName(studentId, originalName) {
    const timestamp = Date.now();
    const extension = originalName.split(".").pop().toLowerCase();
    return `student-${studentId}-${timestamp}.${extension}`;
  }

  /**
   * Upload student image
   * @param {Object} file - Express file object (req.file)
   * @param {Number} studentId - Student ID
   * @returns {Promise<Object>} - { success, publicUrl, storagePath, error }
   */
  async uploadStudentImage(file, studentId) {
    try {
      // Validate
      const validation = this.validateImage(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      // Generate filename
      const fileName = this.generateFileName(studentId, file.originalname);
      const storagePath = `${this.studentFolder}/${fileName}`;

      // Upload file
      const { data, error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        return {
          success: false,
          error: `Upload failed: ${uploadError.message}`,
        };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(storagePath);

      return {
        success: true,
        fileName,
        storagePath,
        publicUrl: urlData.publicUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: `Upload error: ${error.message}`,
      };
    }
  }

  /**
   * Delete image from storage
   * @param {String} storagePath - Path to the image in storage
   * @returns {Promise<Object>} - { success, error }
   */
  async deleteImage(storagePath) {
    try {
      if (!storagePath) {
        return { success: false, error: "Storage path required" };
      }

      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([storagePath]);

      if (error) {
        return {
          success: false,
          error: `Delete failed: ${error.message}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Delete error: ${error.message}`,
      };
    }
  }

  /**
   * Replace image (delete old, upload new)
   * @param {Object} file - Express file object
   * @param {Number} studentId - Student ID
   * @param {String} oldStoragePath - Path to old image
   * @returns {Promise<Object>} - { success, publicUrl, storagePath, error }
   */
  async replaceImage(file, studentId, oldStoragePath) {
    try {
      // Delete old image if it exists
      if (oldStoragePath) {
        const deleteResult = await this.deleteImage(oldStoragePath);
        if (!deleteResult.success) {
          console.warn(`Failed to delete old image: ${deleteResult.error}`);
          // Continue anyway, don't fail the whole operation
        }
      }

      // Upload new image
      return await this.uploadStudentImage(file, studentId);
    } catch (error) {
      return {
        success: false,
        error: `Replace error: ${error.message}`,
      };
    }
  }

  /**
   * Convert Base64 to File-like object
   * Useful for migration
   */
  base64ToBuffer(base64String) {
    try {
      // Remove data URI prefix if present
      const cleanBase64 = base64String.replace(/^data:image\/\w+;base64,/, "");
      return Buffer.from(cleanBase64, "base64");
    } catch (error) {
      throw new Error(`Failed to convert Base64: ${error.message}`);
    }
  }

  /**
   * Detect image type from Base64
   */
  detectImageType(base64String) {
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

    return "jpg";
  }

  /**
   * Upload Base64 image (for migration)
   */
  async uploadBase64Image(base64Data, studentId) {
    try {
      const imageType = this.detectImageType(base64Data);
      const fileName = `student-${studentId}-${Date.now()}.${imageType}`;
      const storagePath = `${this.studentFolder}/${fileName}`;
      const fileBuffer = this.base64ToBuffer(base64Data);

      const { data, error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(storagePath, fileBuffer, {
          contentType: `image/${imageType}`,
          upsert: false,
        });

      if (uploadError) {
        return {
          success: false,
          error: `Upload failed: ${uploadError.message}`,
        };
      }

      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(storagePath);

      return {
        success: true,
        fileName,
        storagePath,
        publicUrl: urlData.publicUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: `Upload error: ${error.message}`,
      };
    }
  }

  /**
   * Get public URL from storage path
   */
  getPublicUrl(storagePath) {
    if (!storagePath) return null;

    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }
}

module.exports = new ImageService();
