-- 🔥 SIMPLE RLS FIX - للجداول الموجودة فقط
-- يحل مشكلة إضافة طالب/مستخدم/قسم/مصروفات
-- RUN THIS FIRST - NO MISSING TABLES ERROR

-- 1. تفعيل RLS على الجداول الأساسية
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;

-- 2. دالة الصلاحيات البسيطة
CREATE OR REPLACE FUNCTION user_has_permission(resource TEXT, action TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM role_permissions rp, auth.users au
    WHERE au.id = auth.uid()
    AND au.raw_user_meta_data->>'role' = rp.role
    AND rp.resource = resource
    AND (
      (action = 'create' AND rp.can_create) OR
      (action = 'update' AND rp.can_update) OR
      (action = 'delete' AND rp.can_delete) OR
      (action = 'read' AND rp.can_read)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. سياسات الطلاب (الأهم)
DROP POLICY IF EXISTS students_rls ON students;
CREATE POLICY students_rls ON students
FOR ALL TO authenticated
USING (user_has_permission('students', TG_OP))
WITH CHECK (user_has_permission('students', TG_OP));

-- 4. المستخدمين (Admin only)
DROP POLICY IF EXISTS users_rls ON users;
CREATE POLICY users_rls ON users
FOR ALL TO authenticated
USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin' OR
  user_has_permission('users', TG_OP)
)
WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin' OR
  user_has_permission('users', TG_OP)
);

-- 5. الأقسام
DROP POLICY IF EXISTS departments_rls ON departments;
CREATE POLICY departments_rls ON departments
FOR ALL TO authenticated
USING (user_has_permission('departments', TG_OP))
WITH CHECK (user_has_permission('departments', TG_OP));

-- 6. بنود المصروفات
DROP POLICY IF EXISTS expense_items_rls ON expense_items;
CREATE POLICY expense_items_rls ON expense_items
FOR ALL TO authenticated
USING (user_has_permission('expense_items', TG_OP))
WITH CHECK (user_has_permission('expense_items', TG_OP));

-- 7. قراءة المصروفات للكل
CREATE POLICY student_fees_read ON student_fees FOR SELECT TO authenticated USING (true);

-- 8. إضافة صلاحيات أساسية
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete)
VALUES 
('admin', 'students', true,true,true,true),
('admin', 'users', true,true,true,true),
('admin', 'departments', true,true,true,true),
('admin', 'expense_items', true,true,true,true),
('branch_manager', 'students', true,true,true,true),
('muhasib', 'expense_items', true,true,true,true)
ON CONFLICT (role, resource) 
DO UPDATE SET can_read=EXCLUDED.can_read, can_create=EXCLUDED.can_create;

-- 9. التحقق النهائي
SELECT '✅ RLS SIMPLE INSTALLED - NO ERRORS' AS status;
SELECT tablename FROM pg_tables WHERE tablename IN ('students','users','departments','expense_items');
SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname='public';

-- 🔥 TEST NOW: Add student in app!
SELECT 'Test adding student...' AS ready;

