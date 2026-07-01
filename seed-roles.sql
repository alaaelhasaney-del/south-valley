-- Seed default roles for academy-management-system
-- Run in Supabase SQL editor

-- Enable RLS and policies for role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage roles" ON role_permissions FOR ALL USING (true);

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins manage users" ON users FOR ALL USING (auth.role() = 'admin' OR true); -- Adjust based on your auth

-- Insert default admin role with full permissions
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'admin', r.resource, true, true, true, true, 'global'
FROM (VALUES 
  ('dashboard'), ('users'), ('students'), ('student_grades'), ('student_fees'), ('student_fees_payments'), 
  ('student_attendance'), ('departments'), ('courses'), ('finances'), ('expense_items'), ('branches'), 
  ('activity_logs'), ('inventory')
) r(resource)
ON CONFLICT (role, resource) DO NOTHING;

-- Insert muhasib (accountant) role
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'muhasib', r.resource, true, true, true, true, 'global'
FROM (VALUES 
  ('finances'), ('expense_items'), ('student_fees'), ('student_fees_payments')
) r(resource)
ON CONFLICT (role, resource) DO NOTHING;

-- Verify
SELECT role, COUNT(*) as permissions FROM role_permissions GROUP BY role;

