-- Essential RBAC table for permissions system
-- Run AFTER enum migration in Supabase SQL Editor

DROP TABLE IF EXISTS role_permissions CASCADE;

CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role user_role NOT NULL,
  resource VARCHAR(50) NOT NULL,
  can_read BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  branch_access VARCHAR(20) DEFAULT 'branch' CHECK (branch_access IN ('global', 'branch')),
  allowed_fields TEXT[], -- JSON array of allowed fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, resource)
);

-- Default permissions for all roles + resources
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access) VALUES
-- Admin: Full access everywhere
('admin', 'users', true, true, true, true, 'global'),
('admin', 'students', true, true, true, true, 'global'),
('admin', 'branches', true, true, true, true, 'global'),
('admin', 'departments', true, true, true, true, 'global'),
('admin', 'courses', true, true, true, true, 'global'),
('admin', 'finances', true, true, true, true, 'global'),
('admin', 'expense_items', true, true, true, true, 'global'),
('admin', 'student_fees', true, true, true, true, 'global'),

-- General Manager: Reports + Read across branches  
('general_manager', 'users', true, false, false, false, 'global'),
('general_manager', 'students', true, false, false, false, 'global'),
('general_manager', 'finances', true, true, true, false, 'global'),
('general_manager', 'branches', true, false, false, false, 'global'),

-- Branch Manager: Full control own branch
('branch_manager', 'users', true, true, true, false, 'branch'),
('branch_manager', 'students', true, true, true, true, 'branch'),
('branch_manager', 'finances', true, true, true, true, 'branch'),
('branch_manager', 'expense_items', true, true, true, false, 'branch'),

-- Employee: Basic read/create own branch
('employee', 'students', true, true, false, false, 'branch'),
('employee', 'student_fees', true, true, false, false, 'branch'),
('employee', 'finances', true, false, false, false, 'branch'),

-- Teacher: Grades + Attendance only
('teacher', 'student_grades', true, true, true, false, 'branch'),
('teacher', 'student_attendance', true, true, true, false, 'branch');

-- Verify
SELECT role, resource, can_read, can_update, branch_access FROM role_permissions ORDER BY role, resource LIMIT 10;

-- Test endpoints will now work!
-- GET /api/permissions/me
-- Roles/Users pages load without 404/500
