-- Production-ready SQL migration: add students.image_url

ALTER TABLE students
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Optional index (helpful if you later filter/search/sort by image_url)
CREATE INDEX IF NOT EXISTS idx_students_image_url ON students(image_url);

