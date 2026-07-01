-- COMPLETE ACADEMY SYSTEM SETUP
-- Run ALL in Supabase SQL Editor

-- 1. Fix enum (original error)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'general_manager';

-- 2. Create permissions table (403 fix)
DROP TABLE IF EXISTS role_permissions CASCADE;
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role user_role NOT NULL,
  resource VARCHAR(50) NOT NULL,
  can_read BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  branch_access VARCHAR(20) DEFAULT 'branch',
  allowed_fields TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, resource)
);

-- 3. Insert permissions
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access) VALUES
('admin', 'users', true,true,true,true,'global'),
('admin', 'students', true,true,true,true,'global'),
('admin', 'branches', true,true,true,true,'global'),
('general_manager', 'users', true,false,false,false,'global'),
('general_manager', 'finances', true,true,true,false,'global'),
('branch_manager', 'students', true,true,true,true,'branch'),
('employee', 'students', true,true,false,false,'branch'),
('teacher', 'student_grades', true,true,true,false,'branch');

-- 4. Create branches
INSERT INTO branches (name) VALUES ('الفرع الرئيسي'), ('فرع 2') ON CONFLICT DO NOTHING;

-- 5. Create ADMIN user (login: admin@example.com / admin123)
INSERT INTO users (name, email, password_hash, role) VALUES 
('مدير النظام', 'admin@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92FDG/30XIeH3UlKHQS6', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 6. Verify
SELECT '✅ Setup Complete' AS status;
SELECT 'Users:', count(*) FROM users;
SELECT 'Branches:', count(*) FROM branches;
SELECT 'Permissions:', count(*) FROM role_permissions;
SELECT unnest(enum_range(NULL::user_role)) AS roles;

-- Test login: admin@example.com / admin123

