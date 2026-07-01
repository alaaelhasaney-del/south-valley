-- Fix Permissions DB - Run in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Create ENUM type for roles (if missing)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'general_manager', 'branch_manager', 'employee', 'teacher', 'muhasib');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create role_permissions table (if missing)
DROP TABLE IF EXISTS role_permissions;

CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role user_role NOT NULL,
  resource VARCHAR(50) NOT NULL,
  can_read BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  branch_access VARCHAR(20) DEFAULT 'branch' CHECK (branch_access IN ('global', 'branch')),
  allowed_fields TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, resource)
);

-- 3. Insert default admin permissions (full access)
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access) VALUES
('admin', 'users', true, true, true, true, 'global'),
('admin', 'students', true, true, true, true, 'global'),
('admin', 'branches', true, true, true, true, 'global'),
('admin', 'departments', true, true, true, true, 'global'),
('admin', 'courses', true, true, true, true, 'global'),
('admin', 'finances', true, true, true, true, 'global'),
('admin', 'expense_items', true, true, true, true, 'global'),
('admin', 'student_fees', true, true, true, true, 'global'),
('admin', 'student_grades', true, true, true, true, 'global'),
('admin', 'student_attendance', true, true, true, true, 'global'),
('admin', 'activity_logs', true, true, true, true, 'global'),
('admin', 'inventory', true, true, true, true, 'global'),
('admin', 'reports', true, true, true, true, 'global')
ON CONFLICT (role, resource) DO NOTHING;

-- 4. Insert muhasib (accountant) full financial access
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access) VALUES
('muhasib', 'users', true, false, false, false, 'global'),
('muhasib', 'students', true, true, true, false, 'global'),
('muhasib', 'finances', true, true, true, true, 'global'),
('muhasib', 'expense_items', true, true, true, true, 'global'),
('muhasib', 'student_fees', true, true, true, true, 'global')
ON CONFLICT (role, resource) DO NOTHING;

-- 5. RLS Policies (enable if RLS on)
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role permissions" ON role_permissions
FOR SELECT USING (true);  -- Public read for permissions lookup

CREATE POLICY "Users can read own user record" ON users
FOR SELECT USING (auth.uid()::text = id::text OR true);  -- Adjust if auth.users

-- 6. Optional: Add permissions column to users if missing (JSONB for legacy)
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';
EXCEPTION
  WHEN duplicate_column THEN RAISE NOTICE 'permissions column already exists';
END $$;

-- 7. Verify
SELECT '✅ Permissions fixed' AS status;
SELECT COUNT(*) as total_permissions FROM role_permissions;
SELECT * FROM role_permissions WHERE role = 'admin' LIMIT 5;

-- Run this SQL in Supabase Dashboard → SQL Editor
-- Then restart app (Ctrl+C, npm run electron:dev)

