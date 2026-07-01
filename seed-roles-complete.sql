-- استعادة كاملة للأدوار والصلاحيات - يعتمد على PERMISSIONS_GUIDE.md ✅ Fixed syntax
-- شغّل هذا في Supabase SQL Editor كـ Admin

-- 1. تمكين RLS إذا لم يكن (تجاهل إذا موجود)
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage roles" ON role_permissions FOR ALL USING (true);

-- 2. حذف الصلاحيات القديمة لإعادة البناء النظيف (اختياري، uncomment إذا لزم)
-- DELETE FROM role_permissions WHERE role != 'admin';

-- 3. إضافة الأدوار الـ 6 كاملة مع الصلاحيات

-- Admin: كامل لكل شيء
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'admin', resource, true, true, true, true, 'global'
FROM (VALUES 
  ('dashboard'), ('users'), ('students'), ('student_grades'), ('student_fees'), ('student_fees_payments'), 
  ('student_attendance'), ('departments'), ('courses'), ('finances'), ('expense_items'), ('branches'), 
  ('activity_logs'), ('inventory'), ('reports')
) AS r(resource)
ON CONFLICT (role, resource) DO UPDATE SET 
  can_read = true, 
  can_create = true, 
  can_update = true, 
  can_delete = true, 
  branch_access = 'global';

-- Muhasib (محاسب): كامل مالية + تقارير
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'muhasib', resource, true, true, true, true, 'global'
FROM (VALUES ('finances'), ('expense_items'), ('student_fees'), ('student_fees_payments'), ('reports')) AS r(resource)
ON CONFLICT (role, resource) DO UPDATE SET 
  can_read = true, can_create = true, can_update = true, can_delete = true, branch_access = 'global';

-- General Manager: عام معظم، محدود مستخدمين
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'general_manager', r.resource, true, true, true, false, 'global'
FROM (VALUES ('dashboard'), ('students'), ('student_grades'), ('departments'), ('courses'), ('branches'), ('reports'))
r(resource)
ON CONFLICT (role, resource) DO UPDATE SET can_read=true, can_create=true, can_update=true, can_delete=false, branch_access='global';

INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
VALUES ('general_manager', 'users', true, true, true, false, 'global')
ON CONFLICT (role, resource) DO UPDATE SET 
  can_read = true, can_create = true, can_update = true, can_delete = false, branch_access = 'global';

-- Branch Manager: كامل فرعه (students, finances)
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'branch_manager', resource, true, true, true, true, 'branch'
FROM (VALUES 
  ('students'), ('student_grades'), ('student_fees'), ('student_fees_payments'), 
  ('student_attendance'), ('finances'), ('expense_items'), ('departments'), ('courses')
) AS r(resource)
ON CONFLICT (role, resource) DO UPDATE SET 
  branch_access = 'branch',
  can_read = true, can_create = true, can_update = true, can_delete = true;

-- Employee (موظف): محدود فرعه
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'employee', resource, true, true, false, false, 'branch'
FROM (VALUES ('students'), ('student_attendance'), ('student_fees_payments')) AS r(resource)
ON CONFLICT (role, resource) DO UPDATE SET 
  can_read = true, can_create = true, can_update = false, can_delete = false, branch_access = 'branch';

-- Teacher: درجات + حضور فقط
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'teacher', resource, true, true, true, false, 'branch'
FROM (VALUES ('student_grades'), ('student_attendance')) AS r(resource)
ON CONFLICT (role, resource) DO UPDATE SET 
  can_read = true, can_create = true, can_update = true, can_delete = false, branch_access = 'branch';

-- 4. التحقق
SELECT role, COUNT(*) as num_permissions, branch_access FROM role_permissions GROUP BY role, branch_access ORDER BY role;

-- 5. قائمة الأدوار المتاحة
SELECT * FROM get_roles_list();

-- جاهز! الآن الأدوار ستظهر في صفحة Users.

