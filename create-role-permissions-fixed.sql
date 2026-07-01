-- Fixed RBAC table - Run AFTER enum migration
-- Adds missing updated_at column

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
  allowed_fields TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, resource)
);

-- Default permissions
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access) VALUES
('admin', 'users', true, true, true, true, 'global'),
('admin', 'students', true, true, true, true, 'global'),
('admin', 'branches', true, true, true, true, 'global'),
('admin', 'departments', true, true, true, true, 'global'),
('admin', 'courses', true, true, true, true, 'global'),
('admin', 'finances', true, true, true, true, 'global'),
('admin', 'expense_items', true, true, true, true, 'global'),
('admin', 'student_fees', true, true, true, true, 'global'),
('general_manager', 'users', true, false, false, false, 'global'),
('general_manager', 'students', true, false, false, false, 'global'),
('general_manager', 'finances', true, true, true, false, 'global'),
('branch_manager', 'users', true, true, true, false, 'branch'),
('branch_manager', 'students', true, true, true, true, 'branch'),
('employee', 'students', true, true, false, false, 'branch'),
('teacher', 'student_grades', true, true, true, false, 'branch');

-- Verify
SELECT COUNT(*) as permissions_count FROM role_permissions;

