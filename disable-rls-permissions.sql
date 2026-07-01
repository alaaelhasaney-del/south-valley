-- Disable RLS for permissions lookup (safe for RBAC table)
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read role_permissions
CREATE POLICY "Authenticated read role_permissions" ON role_permissions
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for users table (fix permissions column select)
CREATE POLICY "Authenticated read own user" ON users
FOR SELECT USING (auth.uid()::uuid = id);

-- Verify
SELECT COUNT(*) FROM role_permissions;
SELECT '✅ RLS fixed' AS status;

