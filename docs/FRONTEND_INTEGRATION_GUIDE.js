/**
 * Frontend Integration Guide - React/Vue Component for Image Upload
 *
 * Example component for uploading student images
 */

// ============================================
// REACT COMPONENT EXAMPLE
// ============================================

import React, { useState, useRef } from "react";
import axios from "axios";

/**
 * StudentImageUpload Component
 *
 * Usage:
 * <StudentImageUpload
 *   studentId={123}
 *   onUploadSuccess={(imageUrl) => console.log(imageUrl)}
 * />
 */
export function StudentImageUpload({ studentId, onUploadSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      onError?.("صيغة الملف غير مدعومة. استخدم: JPEG, PNG, GIF, WebP");
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      onError?.("حجم الملف يتجاوز 5MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Auto upload
    uploadImage(file);
  };

  const uploadImage = async (file) => {
    setLoading(true);

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

      if (response.data.success) {
        setPreview(null);
        onUploadSuccess?.(response.data.student.image_url);
      } else {
        onError?.(response.data.error || "فشل رفع الصورة");
      }
    } catch (error) {
      console.error("Upload error:", error);
      onError?.(error.response?.data?.error || "خطأ في رفع الصورة");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!window.confirm("هل تريد حذف الصورة؟")) return;

    setLoading(true);

    try {
      const response = await axios.delete(`/api/students/${studentId}/image`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        setPreview(null);
        onUploadSuccess?.(null);
      } else {
        onError?.(response.data.error || "فشل حذف الصورة");
      }
    } catch (error) {
      console.error("Delete error:", error);
      onError?.(error.response?.data?.error || "خطأ في حذف الصورة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="image-upload-container">
      <div className="upload-section">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={loading}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="upload-btn"
        >
          {loading ? "جاري الرفع..." : "اختر صورة"}
        </button>

        {preview && (
          <div className="preview-section">
            <img src={preview} alt="Preview" className="preview-image" />
            <button
              onClick={handleDeleteImage}
              disabled={loading}
              className="delete-btn"
            >
              حذف الصورة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// API CLIENT CLASS
// ============================================

/**
 * StudentImageAPI - Helper class for image operations
 */
export class StudentImageAPI {
  constructor(baseURL = "", token = "") {
    this.baseURL = baseURL;
    this.token = token;
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Upload student image
   */
  async uploadImage(studentId, file) {
    const formData = new FormData();
    formData.append("image", file);

    return this.client.post(
      `/api/students/${studentId}/upload-image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  }

  /**
   * Delete student image
   */
  async deleteImage(studentId) {
    return this.client.delete(`/api/students/${studentId}/image`);
  }

  /**
   * Get student image info
   */
  async getImage(studentId) {
    return this.client.get(`/api/students/${studentId}/image`);
  }

  /**
   * Replace image (delete old, upload new)
   */
  async replaceImage(studentId, file) {
    // First delete old image
    try {
      await this.deleteImage(studentId);
    } catch (error) {
      console.warn("Could not delete old image");
    }

    // Then upload new image
    return this.uploadImage(studentId, file);
  }
}

// ============================================
// USAGE EXAMPLE IN FORM
// ============================================

/**
 * Example Student Form with Image Upload
 */
export function StudentForm({ studentId, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    imageUrl: null,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleImageUploadSuccess = (imageUrl) => {
    setFormData({ ...formData, imageUrl });
  };

  const handleImageError = (error) => {
    setErrors({ ...errors, image: error });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Save form data
      const response = await axios.put(
        `/api/students/${studentId}`,
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          image_url: formData.imageUrl, // Already uploaded to storage
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      onSave?.(response.data);
    } catch (error) {
      setErrors({ submit: error.response?.data?.error || "خطأ في الحفظ" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="student-form">
      <div className="form-group">
        <label>الاسم</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="أدخل اسم الطالب"
          required
        />
      </div>

      <div className="form-group">
        <label>الصورة</label>
        <StudentImageUpload
          studentId={studentId}
          onUploadSuccess={handleImageUploadSuccess}
          onError={handleImageError}
        />
        {errors.image && <span className="error">{errors.image}</span>}
      </div>

      <div className="form-group">
        <label>البريد الإلكتروني</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="البريد الإلكتروني"
        />
      </div>

      <div className="form-group">
        <label>الهاتف</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="رقم الهاتف"
        />
      </div>

      {errors.submit && <div className="error-message">{errors.submit}</div>}

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? "جاري الحفظ..." : "حفظ"}
      </button>
    </form>
  );
}

// ============================================
// CSS STYLES
// ============================================

/*
.image-upload-container {
  padding: 20px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  text-align: center;
}

.upload-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.upload-btn {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.upload-btn:hover:not(:disabled) {
  background: #2563eb;
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.preview-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.preview-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
  object-fit: cover;
}

.delete-btn {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.delete-btn:hover:not(:disabled) {
  background: #dc2626;
}

.error {
  color: #ef4444;
  font-size: 14px;
}

.hidden {
  display: none;
}
*/
