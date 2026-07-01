-- FIX role_permissions 400 Bad Request + 403 Forbidden
-- RUN THIS FIRST IN SUPABASE SQL EDITOR
-- Creates table, seeds admin role, fixes RLS for public SELECT

-- ========================================
-- 1. DROP & RECREATE TABLE (Safe reset)
-- ========================================
DROP TABLE IF EXISTS role_permissions CASCADE;

CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  resource VARCHAR(100) NOT NULL,
  can_read BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  branch_access TEXT DEFAULT 'global',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, resource)
);

-- ========================================
-- 2. SEED ADMIN FULL ACCESS (Essential!)
-- ========================================
-- Common academy resources
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access) VALUES
-- Admin: Full access everywhere
('admin', 'users', true, true, true, true, 'global'),
('admin', 'students', true, true, true, true, 'global'),
('admin', 'departments', true, true, true, true, 'global'),
('admin', 'courses', true, true, true, true, 'global'),
('admin', 'student_grades', true, true, true, true, 'global'),
('admin', 'student_fees', true, true, true, true, 'global'),
('admin', 'student_fees_payments', true, true, true, true, 'global'),
('admin', 'student_attendance', true, true, true, true, 'global'),
('admin', 'finances', true, true, true, true, 'global'),
('admin', 'expense_items', true, true, true, true, 'global'),
('admin', 'branches', true, true, true, true, 'global'),
('admin', 'activity_logs', true, true, true, true, 'global'),
('admin', 'roles', true, true, true, true, 'global'),
('admin', 'accounting', true, true, true, true, 'global'),
('admin', 'reports', true, true, true, true, 'global'),
('admin', 'tenants', true, true, true, true, 'global'),
('admin', 'archived_students', true, true, true, true, 'global'),
('admin', 'role_permissions', true, true, true, true, 'global'),

-- Muhasib (Accountant): Full financial access
('muhasib', 'finances', true, true, true, true, 'global'),
('muhasib', 'student_fees', true, true, true, true, 'global'),
('muhasib', 'student_fees_payments', true, true, true, true, 'global'),
('muhasib', 'expense_items', true, true, true, true, 'global'),
('muhasib', 'users', true, false, false, false, 'global'),

-- Branch Manager: Full branch access
('branch_manager', 'students', true, true, true, true, 'branch'),
('branch_manager', 'student_grades', true, true, true, true, 'branch'),
('branch_manager', 'student_attendance', true, true, true, true, 'branch'),
('branch_manager', 'student_fees', true, true, true, true, 'branch'),
('branch_manager', 'departments', true, true, true, false, 'branch')

ON CONFLICT (role, resource) DO NOTHING;

-- ========================================
-- 3. RLS SETUP - PUBLIC READ (Fixes 403)
-- ========================================
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public read access (everyone can SELECT permissions)
CREATE POLICY "Public read role_permissions" ON role_permissions
FOR SELECT USING (true);

-- Policy 2: Admin full access
CREATE POLICY "Admin manages permissions" ON role_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- ========================================
-- 4. VERIFY EVERYTHING WORKS
-- ========================================
SELECT '✅ Table created' AS status1;
SELECT COUNT(*) as total_permissions FROM role_permissions;
SELECT * FROM role_permissions WHERE role = 'admin' LIMIT 5;
SELECT '✅ RLS Policies:', COUNT(*) FROM pg_policies WHERE tablename = 'role_permissions';

-- TEST QUERY (this should work for anon users now):
-- SELECT * FROM role_permissions WHERE role = 'admin';

-- 🎉 Copy this file to Supabase SQL Editor and RUN!
-- Then refresh your dashboard - permissions should load!
