/**
 * Test Suite for Image Management System
 *
 * Run these tests to verify the complete image management system
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Configuration
const API_BASE_URL = "http://localhost:3000";
let authToken = null;
let testStudentId = null;

// Test image files
const testImagePath = path.join(__dirname, "test-image.jpg");

// ============================================
// TEST UTILITIES
// ============================================

function log(message, type = "info") {
  const colors = {
    info: "\x1b[36m", // cyan
    success: "\x1b[32m", // green
    error: "\x1b[31m", // red
    warn: "\x1b[33m", // yellow
    reset: "\x1b[0m",
  };

  const color = colors[type] || colors.info;
  console.log(`${color}[${type.toUpperCase()}] ${message}${colors.reset}`);
}

function separator() {
  console.log("\n" + "=".repeat(50) + "\n");
}

// ============================================
// TEST 1: Environment Setup
// ============================================

async function testEnvironmentSetup() {
  log("Testing environment setup...", "info");

  const required = ["SUPABASE_URL", "SUPABASE_KEY", "DATABASE_URL"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    log(`Missing variables: ${missing.join(", ")}`, "error");
    return false;
  }

  if (!fs.existsSync(path.join(__dirname, "services", "imageService.js"))) {
    log("imageService.js not found", "error");
    return false;
  }

  log("Environment setup verified", "success");
  return true;
}

// ============================================
// TEST 2: API Connection
// ============================================

async function testAPIConnection() {
  log("Testing API connection...", "info");

  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`);
    log("API is running", "success");
    return true;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      log(`Cannot connect to API at ${API_BASE_URL}`, "error");
      log("Make sure the server is running: npm start", "warn");
    } else {
      log(`API error: ${error.message}`, "error");
    }
    return false;
  }
}

// ============================================
// TEST 3: Authentication
// ============================================

async function testAuthentication() {
  log("Testing authentication...", "info");

  try {
    // This assumes you have a login endpoint
    const response = await axios.post(`${API_BASE_URL}/api/login`, {
      email: process.env.TEST_EMAIL || "admin@example.com",
      password: process.env.TEST_PASSWORD || "password",
    });

    if (response.data.token) {
      authToken = response.data.token;
      log(
        `Authentication successful. Token: ${authToken.substring(0, 20)}...`,
        "success",
      );
      return true;
    }
  } catch (error) {
    log(
      `Authentication failed: ${error.response?.data?.error || error.message}`,
      "error",
    );
    log("Make sure you have test credentials in .env", "warn");
    return false;
  }
}

// ============================================
// TEST 4: Create Test Image
// ============================================

function createTestImage() {
  log("Creating test image...", "info");

  // Create a simple 1x1 pixel JPEG
  const jpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
    0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
    0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
    0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
    0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
    0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd4, 0xff, 0xd9,
  ]);

  try {
    fs.writeFileSync(testImagePath, jpegBuffer);
    log(`Test image created at ${testImagePath}`, "success");
    return true;
  } catch (error) {
    log(`Failed to create test image: ${error.message}`, "error");
    return false;
  }
}

// ============================================
// TEST 5: Create Test Student
// ============================================

async function createTestStudent() {
  log("Creating test student...", "info");

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/students`,
      {
        name: "Test Student",
        email: "test@example.com",
        phone: "1234567890",
        branch_id: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    testStudentId = response.data.id;
    log(`Test student created with ID: ${testStudentId}`, "success");
    return true;
  } catch (error) {
    log(
      `Failed to create test student: ${error.response?.data?.error || error.message}`,
      "error",
    );
    return false;
  }
}

// ============================================
// TEST 6: Upload Image
// ============================================

async function testImageUpload() {
  log("Testing image upload...", "info");

  if (!authToken || !testStudentId) {
    log("Authentication or student ID missing", "error");
    return false;
  }

  try {
    const form = new (require("form-data"))();
    form.append("image", fs.createReadStream(testImagePath));

    const response = await axios.post(
      `${API_BASE_URL}/api/students/${testStudentId}/upload-image`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    if (response.data.success && response.data.student.image_url) {
      log(`Image uploaded successfully`, "success");
      log(`URL: ${response.data.student.image_url}`, "info");
      return true;
    } else {
      log(response.data.error || "Unknown error", "error");
      return false;
    }
  } catch (error) {
    log(
      `Upload failed: ${error.response?.data?.error || error.message}`,
      "error",
    );
    return false;
  }
}

// ============================================
// TEST 7: Get Image Info
// ============================================

async function testGetImageInfo() {
  log("Testing get image info...", "info");

  if (!authToken || !testStudentId) {
    log("Authentication or student ID missing", "error");
    return false;
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/students/${testStudentId}/image`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    if (response.data.success && response.data.student) {
      log("Image info retrieved successfully", "success");
      log(`Student: ${response.data.student.name}`, "info");
      log(`Image URL: ${response.data.student.image_url}`, "info");
      return true;
    } else {
      log(response.data.error || "Unknown error", "error");
      return false;
    }
  } catch (error) {
    log(
      `Get info failed: ${error.response?.data?.error || error.message}`,
      "error",
    );
    return false;
  }
}

// ============================================
// TEST 8: Delete Image
// ============================================

async function testDeleteImage() {
  log("Testing image deletion...", "info");

  if (!authToken || !testStudentId) {
    log("Authentication or student ID missing", "error");
    return false;
  }

  try {
    const response = await axios.delete(
      `${API_BASE_URL}/api/students/${testStudentId}/image`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    if (response.data.success) {
      log("Image deleted successfully", "success");
      return true;
    } else {
      log(response.data.error || "Unknown error", "error");
      return false;
    }
  } catch (error) {
    log(
      `Delete failed: ${error.response?.data?.error || error.message}`,
      "error",
    );
    return false;
  }
}

// ============================================
// TEST 9: File Validation
// ============================================

async function testFileValidation() {
  log("Testing file validation...", "info");

  if (!authToken || !testStudentId) {
    log("Authentication or student ID missing", "error");
    return false;
  }

  try {
    // Test with invalid file type
    log("Testing invalid file type...", "info");
    const form = new (require("form-data"))();
    form.append("image", Buffer.from("invalid data"), "test.txt");

    try {
      await axios.post(
        `${API_BASE_URL}/api/students/${testStudentId}/upload-image`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${authToken}`,
          },
        },
      );
      log("File validation failed - accepted invalid file", "error");
      return false;
    } catch (error) {
      if (error.response?.status === 400) {
        log("Correctly rejected invalid file type", "success");
        return true;
      } else {
        log("Unexpected error", "error");
        return false;
      }
    }
  } catch (error) {
    log(`Validation test error: ${error.message}`, "error");
    return false;
  }
}

// ============================================
// CLEANUP
// ============================================

async function cleanup() {
  log("Cleaning up test data...", "info");

  try {
    if (authToken && testStudentId) {
      // Try to delete test image
      try {
        await axios.delete(
          `${API_BASE_URL}/api/students/${testStudentId}/image`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          },
        );
        log("Test image deleted", "success");
      } catch (error) {
        // Image might not exist, that's fine
      }

      // Delete test student
      try {
        await axios.delete(`${API_BASE_URL}/api/students/${testStudentId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        log("Test student deleted", "success");
      } catch (error) {
        log("Could not delete test student", "warn");
      }
    }

    // Delete test image file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      log("Test image file deleted", "success");
    }
  } catch (error) {
    log(`Cleanup error: ${error.message}`, "warn");
  }
}

// ============================================
// RUN ALL TESTS
// ============================================

async function runAllTests() {
  console.log("\n");
  log("======================================", "info");
  log("Image Management System - Test Suite", "info");
  log("======================================", "info");
  separator();

  const results = {};

  // Test 1
  results["Environment Setup"] = await testEnvironmentSetup();
  separator();

  // Test 2
  results["API Connection"] = await testAPIConnection();
  separator();

  if (!results["API Connection"]) {
    log("Skipping remaining tests - API not available", "error");
    return summarizeResults(results);
  }

  // Test 3
  results["Authentication"] = await testAuthentication();
  separator();

  if (!results["Authentication"]) {
    log("Skipping remaining tests - Authentication failed", "error");
    return summarizeResults(results);
  }

  // Test 4
  results["Create Test Image"] = createTestImage();
  separator();

  // Test 5
  results["Create Test Student"] = await createTestStudent();
  separator();

  // Test 6
  results["Image Upload"] = await testImageUpload();
  separator();

  // Test 7
  results["Get Image Info"] = await testGetImageInfo();
  separator();

  // Test 8
  results["File Validation"] = await testFileValidation();
  separator();

  // Test 9
  results["Delete Image"] = await testDeleteImage();
  separator();

  // Cleanup
  await cleanup();
  separator();

  summarizeResults(results);
}

// ============================================
// SUMMARY
// ============================================

function summarizeResults(results) {
  log("Test Results Summary", "info");
  log("=".repeat(50), "info");

  let passed = 0;
  let failed = 0;

  Object.entries(results).forEach(([test, result]) => {
    if (result) {
      log(`✓ ${test}`, "success");
      passed++;
    } else {
      log(`✗ ${test}`, "error");
      failed++;
    }
  });

  separator();
  log(
    `Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`,
    "info",
  );

  if (failed === 0) {
    log("All tests passed! Image system is working correctly.", "success");
  } else {
    log(
      `${failed} test(s) failed. Check the output above for details.`,
      "error",
    );
  }
}

// ============================================
// START TESTS
// ============================================

runAllTests().catch((error) => {
  log(`Test suite error: ${error.message}`, "error");
  process.exit(1);
});

// Export for use in other test runners
module.exports = {
  testEnvironmentSetup,
  testAPIConnection,
  testAuthentication,
  createTestImage,
  createTestStudent,
  testImageUpload,
  testGetImageInfo,
  testDeleteImage,
  testFileValidation,
  cleanup,
  runAllTests,
};
