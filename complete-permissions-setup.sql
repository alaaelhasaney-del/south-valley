-- Complete Permissions Setup for All Roles and Resources
-- Run this after supabase-setup-complete.sql

-- Clear existing permissions
DELETE FROM role_permissions;

-- Insert comprehensive permissions for all roles and resources
-- Admin gets full access to everything
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access) VALUES
-- Admin - Full access to all resources
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
('admin', 'reports', true, true, true, true, 'global'),

-- General Manager - Broad access but limited writing
('general_manager', 'users', true, false, false, false, 'global'),
('general_manager', 'students', true, true, true, false, 'global'),
('general_manager', 'branches', true, false, false, false, 'global'),
('general_manager', 'departments', true, true, true, false, 'global'),
('general_manager', 'courses', true, true, true, false, 'global'),
('general_manager', 'finances', true, true, true, false, 'global'),
('general_manager', 'expense_items', true, true, true, false, 'global'),
('general_manager', 'student_fees', true, true, true, false, 'global'),
('general_manager', 'student_grades', true, false, false, false, 'global'),
('general_manager', 'student_attendance', true, false, false, false, 'global'),
('general_manager', 'activity_logs', true, false, false, false, 'global'),
('general_manager', 'inventory', true, true, true, false, 'global'),
('general_manager', 'reports', true, false, false, false, 'global'),

-- Branch Manager - Full access to their branch
('branch_manager', 'users', true, false, false, false, 'branch'),
('branch_manager', 'students', true, true, true, true, 'branch'),
('branch_manager', 'branches', true, false, false, false, 'branch'),
('branch_manager', 'departments', true, false, false, false, 'branch'),
('branch_manager', 'courses', true, true, true, false, 'branch'),
('branch_manager', 'finances', true, true, true, true, 'branch'),
('branch_manager', 'expense_items', true, true, true, false, 'branch'),
('branch_manager', 'student_fees', true, true, true, true, 'branch'),
('branch_manager', 'student_grades', true, true, true, false, 'branch'),
('branch_manager', 'student_attendance', true, true, true, false, 'branch'),
('branch_manager', 'activity_logs', true, false, false, false, 'branch'),
('branch_manager', 'inventory', true, true, true, false, 'branch'),
('branch_manager', 'reports', true, false, false, false, 'branch'),

-- Employee - Limited access
('employee', 'users', false, false, false, false, 'branch'),
('employee', 'students', true, true, false, false, 'branch'),
('employee', 'branches', true, false, false, false, 'branch'),
('employee', 'departments', true, false, false, false, 'branch'),
('employee', 'courses', true, false, false, false, 'branch'),
('employee', 'finances', true, false, false, false, 'branch'),
('employee', 'expense_items', true, false, false, false, 'branch'),
('employee', 'student_fees', true, true, true, false, 'branch'),
('employee', 'student_grades', false, false, false, false, 'branch'),
('employee', 'student_attendance', true, true, false, false, 'branch'),
('employee', 'activity_logs', false, false, false, false, 'branch'),
('employee', 'inventory', true, false, false, false, 'branch'),
('employee', 'reports', false, false, false, false, 'branch'),

-- Teacher - Grades and attendance only
('teacher', 'users', false, false, false, false, 'branch'),
('teacher', 'students', true, false, false, false, 'branch'),
('teacher', 'branches', false, false, false, false, 'branch'),
('teacher', 'departments', false, false, false, false, 'branch'),
('teacher', 'courses', true, false, false, false, 'branch'),
('teacher', 'finances', false, false, false, false, 'branch'),
('teacher', 'expense_items', false, false, false, false, 'branch'),
('teacher', 'student_fees', false, false, false, false, 'branch'),
('teacher', 'student_grades', true, true, true, false, 'branch'),
('teacher', 'student_attendance', true, true, true, false, 'branch'),
('teacher', 'activity_logs', false, false, false, false, 'branch'),
('teacher', 'inventory', false, false, false, false, 'branch'),
('teacher', 'reports', false, false, false, false, 'branch');

-- Verify setup
SELECT '✅ Complete Permissions Setup' AS status;
SELECT role, COUNT(*) as permissions_count
FROM role_permissions
GROUP BY role
ORDER BY role;

SELECT resource, COUNT(*) as roles_count
FROM role_permissions
GROUP BY resource
ORDER BY resource;