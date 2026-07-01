-- Complete Role Permissions Setup for Supabase
-- Run this ENTIRE script in Supabase SQL Editor as Admin

-- ========================================
-- 1. CREATE TABLE (if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  resource TEXT NOT NULL,
  can_read BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  branch_access TEXT CHECK (branch_access IN ('global', 'branch')) DEFAULT 'global',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint (critical for ON CONFLICT)
ALTER TABLE public.role_permissions 
ADD CONSTRAINT IF NOT EXISTS unique_role_resource UNIQUE (role, resource);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON role_permissions(resource);

-- ========================================
-- 2. RLS + Policies
-- ========================================
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY IF NOT EXISTS "Admins manage roles" 
ON role_permissions FOR ALL 
TO authenticated 
USING (true);

-- ========================================
-- 3. get_roles_list() Function
-- ========================================
CREATE OR REPLACE FUNCTION get_roles_list()
RETURNS TABLE (role text)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT role FROM role_permissions 
  WHERE role IS NOT NULL AND role != '' 
  ORDER BY role;
$$;

GRANT EXECUTE ON FUNCTION get_roles_list() TO authenticated, anon, service_role;

-- ========================================
-- 4. SEED ALL ROLES (from seed-roles-complete.sql)
-- ========================================
-- Admin
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'admin', resource, true, true, true, true, 'global'
FROM (VALUES 
  ('dashboard'), ('users'), ('students'), ('student_grades'), ('student_fees'), ('student_fees_payments'), 
  ('student_attendance'), ('departments'), ('courses'), ('finances'), ('expense_items'), ('branches'), 
  ('activity_logs'), ('inventory'), ('reports')
) AS r(resource)
ON CONFLICT (role, resource) DO UPDATE SET 
  can_read = true, can_create = true, can_update = true, can_delete = true, branch_access = 'global';

-- Muhasib
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'muhasib', resource, true, true, true, true, 'global'
FROM (VALUES ('finances'), ('expense_items'), ('student_fees'), ('student_fees_payments'), ('reports')) AS r(resource)
ON CONFLICT (role, resource) DO UPDATE SET 
  can_read = true, can_create = true, can_update = true, can_delete = true, branch_access = 'global';

-- General Manager
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'general_manager', r.resource, true, true, true, false, 'global'
FROM (VALUES ('dashboard'), ('students'), ('student_grades'), ('departments'), ('courses'), ('branches'), ('reports'))
r(resource)
ON CONFLICT (role, resource) DO UPDATE SET can_read=true, can_create=true, can_update=true, can_delete=false, branch_access='global';

INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
VALUES ('general_manager', 'users', true, true, true, false, 'global')
ON CONFLICT (role, resource) DO UPDATE SET 
  can_read = true, can_create = true, can_update = true, can_delete = false, branch_access = 'global';

-- Branch Manager  
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'branch_manager', resource, true, true, true, true, 'branch'
FROM (VALUES 
  ('students'), ('student_grades'), ('student_fees'), ('student_fees_payments'), 
  ('student_attendance'), ('finances'), ('expense_items'), ('departments'), ('courses')
) AS r(resource)
ON CONFLICT (role, resource) DO UPDATE SET 
  branch_access = 'branch',
  can_read = true, can_create = true, can_update = true, can_delete = true;

-- Employee
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'employee', resource, true, true, false, false, 'branch'
FROM (VALUES ('students'), ('student_attendance'), ('student_fees_payments')) AS r(resource)
ON CONFLICT (role, resource) DO UPDATE SET 
  can_read = true, can_create = true, can_update = false, can_delete = false, branch_access = 'branch';

-- Teacher
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'teacher', resource, true, true, true, false, 'branch'
FROM (VALUES ('student_grades'), ('student_attendance')) AS r(resource)
ON CONFLICT (role, resource) DO UPDATE SET 
  can_read = true, can_create = true, can_update = true, can_delete = false, branch_access = 'branch';

-- ========================================
-- 5. VERIFICATION QUERIES
-- ========================================
SELECT 'Roles created:' as status, COUNT(*) as count FROM role_permissions;
SELECT role, COUNT(*) as permissions, string_agg(branch_access, ', ') as access FROM role_permissions GROUP BY role ORDER BY role;
SELECT * FROM get_roles_list();

-- 🎉 Ready! Roles now available in Users page dropdown.
