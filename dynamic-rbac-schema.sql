-- ============================================================================
-- Dynamic RBAC System - Database Schema
-- This file implements a Many-to-Many relationship between Roles and Permissions
-- ============================================================================

-- ============================================================================
-- 1. Roles Table
-- ============================================================================
DROP TABLE IF EXISTS roles CASCADE;
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- true for: admin (cannot be deleted)
  tenant_id INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (name, description, is_system, tenant_id) VALUES
  ('admin', 'مسؤول النظام - صلاحيات كاملة', true, 1),
  ('general_manager', 'المدير العام', false, 1),
  ('branch_manager', 'مدير الفرع', false, 1),
  ('employee', 'موظف', false, 1),
  ('teacher', 'معلم', false, 1),
  ('muhasib', 'محاسب', false, 1)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. Permissions Table
-- ============================================================================
DROP TABLE IF EXISTS permissions CASCADE;
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE, -- e.g., "dashboard.view", "students.create"
  display_name VARCHAR(255) NOT NULL, -- e.g., "عرض لوحة التحكم"
  resource VARCHAR(100) NOT NULL, -- e.g., "dashboard", "students"
  action VARCHAR(50) NOT NULL, -- e.g., "view", "create", "update", "delete"
  description TEXT,
  tenant_id INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert permissions
INSERT INTO permissions (key, display_name, resource, action, description, tenant_id) VALUES
  -- Dashboard
  ('dashboard.view', 'عرض لوحة التحكم الرئيسية', 'dashboard', 'view', 'الوصول إلى لوحة التحكم الرئيسية', 1),
  
  -- Users Management
  ('users.view', 'عرض المستخدمين', 'users', 'view', 'عرض قائمة المستخدمين', 1),
  ('users.create', 'إضافة مستخدمين جدد', 'users', 'create', 'إنشاء حسابات مستخدمين جديدة', 1),
  ('users.update', 'تعديل المستخدمين', 'users', 'update', 'تعديل بيانات المستخدمين', 1),
  ('users.delete', 'حذف المستخدمين', 'users', 'delete', 'حذف حسابات المستخدمين', 1),
  
  -- Students Management
  ('students.view', 'عرض الطلاب', 'students', 'view', 'عرض قائمة الطلاب', 1),
  ('students.create', 'إضافة طلاب جدد', 'students', 'create', 'تسجيل طلاب جدد', 1),
  ('students.update', 'تعديل بيانات الطلاب', 'students', 'update', 'تحديث بيانات الطلاب', 1),
  ('students.delete', 'حذف الطلاب', 'students', 'delete', 'حذف سجلات الطلاب', 1),
  
  -- Student Grades
  ('grades.view', 'عرض درجات الطلاب', 'grades', 'view', 'عرض درجات الطلاب', 1),
  ('grades.create', 'إدخال الدرجات', 'grades', 'create', 'إدخال درجات جديدة', 1),
  ('grades.update', 'تعديل الدرجات', 'grades', 'update', 'تحديث الدرجات', 1),
  ('grades.delete', 'حذف الدرجات', 'grades', 'delete', 'حذف الدرجات', 1),
  
  -- Student Fees
  ('fees.view', 'عرض الرسوم الدراسية', 'fees', 'view', 'عرض قائمة الرسوم', 1),
  ('fees.create', 'إضافة رسوم جديدة', 'fees', 'create', 'إنشاء رسوم دراسية جديدة', 1),
  ('fees.update', 'تعديل الرسوم', 'fees', 'update', 'تحديث الرسوم', 1),
  ('fees.delete', 'حذف الرسوم', 'fees', 'delete', 'حذف الرسوم', 1),
  
  -- Payments
  ('payments.view', 'عرض السدادات', 'payments', 'view', 'عرض عمليات السداد', 1),
  ('payments.create', 'تسجيل سداد', 'payments', 'create', 'تسجيل عملية سداد جديدة', 1),
  ('payments.update', 'تعديل السدادات', 'payments', 'update', 'تعديل السدادات', 1),
  ('payments.delete', 'حذف السدادات', 'payments', 'delete', 'حذف السدادات', 1),
  
  -- Attendance
  ('attendance.view', 'عرض الحضور', 'attendance', 'view', 'عرض سجلات الحضور', 1),
  ('attendance.create', 'تسجيل حضور', 'attendance', 'create', 'تسجيل حضور جديد', 1),
  ('attendance.update', 'تعديل الحضور', 'attendance', 'update', 'تعديل سجلات الحضور', 1),
  
  -- Departments
  ('departments.view', 'عرض الأقسام', 'departments', 'view', 'عرض قائمة الأقسام', 1),
  ('departments.create', 'إضافة أقسام', 'departments', 'create', 'إنشاء أقسام جديدة', 1),
  ('departments.update', 'تعديل الأقسام', 'departments', 'update', 'تعديل الأقسام', 1),
  ('departments.delete', 'حذف الأقسام', 'departments', 'delete', 'حذف الأقسام', 1),
  
  -- Courses
  ('courses.view', 'عرض المقررات', 'courses', 'view', 'عرض المقررات الدراسية', 1),
  ('courses.create', 'إضافة مقررات', 'courses', 'create', 'إنشاء مقررات جديدة', 1),
  ('courses.update', 'تعديل المقررات', 'courses', 'update', 'تعديل المقررات', 1),
  ('courses.delete', 'حذف المقررات', 'courses', 'delete', 'حذف المقررات', 1),
  
  -- Branches
  ('branches.view', 'عرض الفروع', 'branches', 'view', 'عرض قائمة الفروع', 1),
  ('branches.create', 'إضافة فروع', 'branches', 'create', 'إنشاء فروع جديدة', 1),
  ('branches.update', 'تعديل الفروع', 'branches', 'update', 'تعديل الفروع', 1),
  ('branches.delete', 'حذف الفروع', 'branches', 'delete', 'حذف الفروع', 1),
  
  -- Reports
  ('reports.view', 'عرض التقارير', 'reports', 'view', 'عرض التقارير المختلفة', 1),
  
  -- Permissions Management
  ('permissions.manage', 'إدارة الصلاحيات', 'permissions', 'manage', 'إدارة الأدوار والصلاحيات', 1)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 3. Role Permissions Junction Table (Many-to-Many)
-- ============================================================================
DROP TABLE IF EXISTS role_permissions CASCADE;
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  tenant_id INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id, tenant_id)
);

-- ============================================================================
-- 4. Assign Default Permissions to Roles
-- ============================================================================

-- Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id, tenant_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'admin' AND tenant_id = 1) as role_id,
  id as permission_id,
  1 as tenant_id
FROM permissions WHERE tenant_id = 1
ON CONFLICT DO NOTHING;

-- General Manager: View and limited create
INSERT INTO role_permissions (role_id, permission_id, tenant_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'general_manager' AND tenant_id = 1) as role_id,
  id as permission_id,
  1 as tenant_id
FROM permissions 
WHERE tenant_id = 1 
  AND (action IN ('view', 'create') OR key IN ('reports.view', 'dashboard.view'))
ON CONFLICT DO NOTHING;

-- Branch Manager: Branch-level management
INSERT INTO role_permissions (role_id, permission_id, tenant_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'branch_manager' AND tenant_id = 1) as role_id,
  id as permission_id,
  1 as tenant_id
FROM permissions 
WHERE tenant_id = 1 
  AND resource IN ('students', 'fees', 'payments', 'grades', 'reports', 'dashboard')
ON CONFLICT DO NOTHING;

-- Employee: Limited view and create
INSERT INTO role_permissions (role_id, permission_id, tenant_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'employee' AND tenant_id = 1) as role_id,
  id as permission_id,
  1 as tenant_id
FROM permissions 
WHERE tenant_id = 1 
  AND key IN ('students.view', 'students.create', 'fees.view', 'payments.view', 'attendance.create', 'dashboard.view')
ON CONFLICT DO NOTHING;

-- Teacher: View grades and attendance
INSERT INTO role_permissions (role_id, permission_id, tenant_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'teacher' AND tenant_id = 1) as role_id,
  id as permission_id,
  1 as tenant_id
FROM permissions 
WHERE tenant_id = 1 
  AND key IN ('grades.view', 'grades.create', 'grades.update', 'attendance.view', 'attendance.create', 'students.view', 'dashboard.view')
ON CONFLICT DO NOTHING;

-- Muhasib (Accountant): Financial management
INSERT INTO role_permissions (role_id, permission_id, tenant_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'muhasib' AND tenant_id = 1) as role_id,
  id as permission_id,
  1 as tenant_id
FROM permissions 
WHERE tenant_id = 1 
  AND resource IN ('fees', 'payments', 'reports')
  OR key IN ('students.view', 'dashboard.view')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. Helper View: User Permissions (Easy lookup)
-- ============================================================================
DROP VIEW IF EXISTS user_permissions_view CASCADE;
CREATE VIEW user_permissions_view AS
SELECT 
  u.id as user_id,
  u.email,
  r.id as role_id,
  r.name as role_name,
  p.id as permission_id,
  p.key as permission_key,
  p.display_name,
  p.resource,
  p.action
FROM users u
LEFT JOIN roles r ON u.role = r.name AND u.tenant_id = r.tenant_id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.tenant_id = r.tenant_id OR r.tenant_id IS NULL;

-- ============================================================================
-- 6. Verification Queries
-- ============================================================================
-- Check roles
SELECT COUNT(*) as total_roles FROM roles;

-- Check permissions
SELECT COUNT(*) as total_permissions FROM permissions;

-- Check role_permissions
SELECT COUNT(*) as total_role_permissions FROM role_permissions;

-- View Admin permissions (should see all)
SELECT p.display_name 
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'admin'
ORDER BY p.display_name;
