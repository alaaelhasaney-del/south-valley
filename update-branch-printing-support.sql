-- Safe branch schema and receipt support for multi-branch Supabase setup
-- Run this in the Supabase SQL editor.

BEGIN;

-- 1. Create branches table if it does not exist
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing branch metadata columns to existing branches table safely
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_name TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Preserve existing branch names by copying name -> branch_name when needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'branches'
      AND column_name = 'name'
  ) THEN
    UPDATE branches
    SET branch_name = name
    WHERE branch_name IS NULL
      AND name IS NOT NULL;
  END IF;
END$$;

-- 4. Make sure student-level branch_id exists for branch-specific data access
ALTER TABLE students ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE student_fees_payments ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL;

-- 5. Backfill branch_id from existing relations where possible
UPDATE student_fees sf
SET branch_id = s.branch_id
FROM students s
WHERE sf.student_id = s.id
  AND sf.branch_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'student_fees_payments'
      AND column_name = 'student_fee_id'
  ) THEN
    UPDATE student_fees_payments sfp
    SET branch_id = sf.branch_id
    FROM student_fees sf
    WHERE sfp.student_fee_id = sf.id
      AND sfp.branch_id IS NULL;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'student_fees_payments'
      AND column_name = 'fee_id'
  ) THEN
    UPDATE student_fees_payments sfp
    SET branch_id = sf.branch_id
    FROM student_fees sf
    WHERE sfp.fee_id = sf.id
      AND sfp.branch_id IS NULL;
  END IF;
END$$;

-- 6. Add indexes for branch access performance
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_branch ON student_fees(branch_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_payments_branch ON student_fees_payments(branch_id);

COMMIT;
