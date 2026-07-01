-- ONLY students table update - Run in Supabase SQL Editor

-- Add new columns (IF NOT EXISTS safe)
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS governorate VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS national_id VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS qualification VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_year VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_data TEXT;

-- Index
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department_id);

-- Done!

