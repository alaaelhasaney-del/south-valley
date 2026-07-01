-- Migration: Add image_url column to students table
-- This migration adds the image_url column to store Supabase Storage paths

BEGIN;

-- Add image_url column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_upload_date column to track when image was uploaded
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS image_upload_date TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_image_url ON students(image_url);
CREATE INDEX IF NOT EXISTS idx_students_image_upload_date ON students(image_upload_date);

-- Add comment to explain the column
COMMENT ON COLUMN students.image_url IS 'Supabase Storage public URL or path to student photo';
COMMENT ON COLUMN students.image_upload_date IS 'Timestamp when the image was uploaded to storage';

COMMIT;
