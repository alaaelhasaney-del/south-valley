-- Migration: Add photo_data column to students table (fixes 500 error)
-- Safe: IF NOT EXISTS prevents errors if already exists

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS photo_data TEXT;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'photo_data';

