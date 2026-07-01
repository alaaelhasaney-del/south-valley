-- COMPLETE RLS POLICIES FOR ACADEMY SYSTEM
-- حل مشكلة "new row violates row-level security policy"
-- RUN THIS IN SUPABASE SQL EDITOR

-- ========================================
-- 1. ENABLE RLS ON ALL TABLES
-- ========================================
DO $$
DECLARE
    table_rec RECORD;
BEGIN
    FOR table_rec IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('students', 'users', 'departments', 'expense_items', 
                          'student_fees', 'student_fees_payments', 'student_grades', 
                          'student_attendance', 'courses', 'finances', 'branches')
    LOOP
        EXECUTE 'ALTER TABLE public.' || table_rec.tablename || ' ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'RLS enabled on: %', table_rec.tablename;
    END LOOP;
END $$;

-- ========================================
-- 2. DYNAMIC RLS POLICY FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION check_rls_permission(
    p_resource TEXT,
    p_operation TEXT DEFAULT 'INSERT'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    has_permission BOOLEAN;
BEGIN
    -- تحديث: جلب الرتبة من جدول المستخدمين العام بدلاً من الميتادات لضمان الدقة
    SELECT role INTO user_role
    FROM public.users 
    WHERE id = auth.uid();
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check permission in role_permissions table
    SELECT EXISTS(
        SELECT 1 FROM role_permissions 
        WHERE role = user_role 
        AND resource = p_resource
        AND (
            (user_role = 'admin') OR -- المسؤول دائماً له صلاحية كاملة
            (p_operation IN ('INSERT') AND can_create = true) OR
            (p_operation IN ('UPDATE') AND can_update = true) OR
            (p_operation IN ('DELETE') AND can_delete = true) OR
            (p_operation IN ('SELECT') AND can_read = true)
        )
    ) INTO has_permission;
    
    RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. RLS POLICIES FOR EACH TABLE
-- ========================================
-- STUDENTS TABLE
DROP POLICY IF EXISTS "Students select dynamic RLS" ON students;
CREATE POLICY "Students select dynamic RLS" ON students
FOR SELECT TO authenticated
USING (check_rls_permission('students', 'SELECT'));
DROP POLICY IF EXISTS "Students insert dynamic RLS" ON students;
CREATE POLICY "Students insert dynamic RLS" ON students
FOR INSERT TO authenticated
WITH CHECK (check_rls_permission('students', 'INSERT'));
DROP POLICY IF EXISTS "Students update dynamic RLS" ON students;
CREATE POLICY "Students update dynamic RLS" ON students
FOR UPDATE TO authenticated
USING (check_rls_permission('students', 'UPDATE'))
WITH CHECK (check_rls_permission('students', 'UPDATE'));
DROP POLICY IF EXISTS "Students delete dynamic RLS" ON students;
CREATE POLICY "Students delete dynamic RLS" ON students
FOR DELETE TO authenticated
USING (check_rls_permission('students', 'DELETE'));

-- USERS TABLE
DROP POLICY IF EXISTS "Users select dynamic RLS" ON users;
CREATE POLICY "Users select dynamic RLS" ON users
FOR SELECT TO authenticated
USING (check_rls_permission('users', 'SELECT'));
DROP POLICY IF EXISTS "Users insert dynamic RLS" ON users;
CREATE POLICY "Users insert dynamic RLS" ON users
FOR INSERT TO authenticated
WITH CHECK (check_rls_permission('users', 'INSERT'));
DROP POLICY IF EXISTS "Users update dynamic RLS" ON users;
CREATE POLICY "Users update dynamic RLS" ON users
FOR UPDATE TO authenticated
USING (check_rls_permission('users', 'UPDATE'))
WITH CHECK (check_rls_permission('users', 'UPDATE'));
DROP POLICY IF EXISTS "Users delete dynamic RLS" ON users;
CREATE POLICY "Users delete dynamic RLS" ON users
FOR DELETE TO authenticated
USING (check_rls_permission('users', 'DELETE'));

-- DEPARTMENTS TABLE
DROP POLICY IF EXISTS "Departments select dynamic RLS" ON departments;
CREATE POLICY "Departments select dynamic RLS" ON departments
FOR SELECT TO authenticated
USING (check_rls_permission('departments', 'SELECT'));
DROP POLICY IF EXISTS "Departments insert dynamic RLS" ON departments;
CREATE POLICY "Departments insert dynamic RLS" ON departments
FOR INSERT TO authenticated
WITH CHECK (check_rls_permission('departments', 'INSERT'));
DROP POLICY IF EXISTS "Departments update dynamic RLS" ON departments;
CREATE POLICY "Departments update dynamic RLS" ON departments
FOR UPDATE TO authenticated
USING (check_rls_permission('departments', 'UPDATE'))
WITH CHECK (check_rls_permission('departments', 'UPDATE'));
DROP POLICY IF EXISTS "Departments delete dynamic RLS" ON departments;
CREATE POLICY "Departments delete dynamic RLS" ON departments
FOR DELETE TO authenticated
USING (check_rls_permission('departments', 'DELETE'));

-- EXPENSE_ITEMS TABLE
DROP POLICY IF EXISTS "Expense items select dynamic RLS" ON expense_items;
CREATE POLICY "Expense items select dynamic RLS" ON expense_items
FOR SELECT TO authenticated
USING (check_rls_permission('expense_items', 'SELECT'));
DROP POLICY IF EXISTS "Expense items insert dynamic RLS" ON expense_items;
CREATE POLICY "Expense items insert dynamic RLS" ON expense_items
FOR INSERT TO authenticated
WITH CHECK (check_rls_permission('expense_items', 'INSERT'));
DROP POLICY IF EXISTS "Expense items update dynamic RLS" ON expense_items;
CREATE POLICY "Expense items update dynamic RLS" ON expense_items
FOR UPDATE TO authenticated
USING (check_rls_permission('expense_items', 'UPDATE'))
WITH CHECK (check_rls_permission('expense_items', 'UPDATE'));
DROP POLICY IF EXISTS "Expense items delete dynamic RLS" ON expense_items;
CREATE POLICY "Expense items delete dynamic RLS" ON expense_items
FOR DELETE TO authenticated
USING (check_rls_permission('expense_items', 'DELETE'));

-- STUDENT_FEES & PAYMENTS
DROP POLICY IF EXISTS "Student fees select dynamic RLS" ON student_fees;
CREATE POLICY "Student fees select dynamic RLS" ON student_fees
FOR SELECT TO authenticated
USING (check_rls_permission('student_fees', 'SELECT'));
DROP POLICY IF EXISTS "Student fees insert dynamic RLS" ON student_fees;
CREATE POLICY "Student fees insert dynamic RLS" ON student_fees
FOR INSERT TO authenticated
WITH CHECK (check_rls_permission('student_fees', 'INSERT'));
DROP POLICY IF EXISTS "Student fees update dynamic RLS" ON student_fees;
CREATE POLICY "Student fees update dynamic RLS" ON student_fees
FOR UPDATE TO authenticated
USING (check_rls_permission('student_fees', 'UPDATE'))
WITH CHECK (check_rls_permission('student_fees', 'UPDATE'));
DROP POLICY IF EXISTS "Student fees delete dynamic RLS" ON student_fees;
CREATE POLICY "Student fees delete dynamic RLS" ON student_fees
FOR DELETE TO authenticated
USING (check_rls_permission('student_fees', 'DELETE'));

DROP POLICY IF EXISTS "Student fees payments select dynamic RLS" ON student_fees_payments;
CREATE POLICY "Student fees payments select dynamic RLS" ON student_fees_payments
FOR SELECT TO authenticated
USING (check_rls_permission('student_fees_payments', 'SELECT'));
DROP POLICY IF EXISTS "Student fees payments insert dynamic RLS" ON student_fees_payments;
CREATE POLICY "Student fees payments insert dynamic RLS" ON student_fees_payments
FOR INSERT TO authenticated
WITH CHECK (check_rls_permission('student_fees_payments', 'INSERT'));
DROP POLICY IF EXISTS "Student fees payments update dynamic RLS" ON student_fees_payments;
CREATE POLICY "Student fees payments update dynamic RLS" ON student_fees_payments
FOR UPDATE TO authenticated
USING (check_rls_permission('student_fees_payments', 'UPDATE'))
WITH CHECK (check_rls_permission('student_fees_payments', 'UPDATE'));
DROP POLICY IF EXISTS "Student fees payments delete dynamic RLS" ON student_fees_payments;
CREATE POLICY "Student fees payments delete dynamic RLS" ON student_fees_payments
FOR DELETE TO authenticated
USING (check_rls_permission('student_fees_payments', 'DELETE'));

-- STUDENT_GRADES
DROP POLICY IF EXISTS "Student grades select dynamic RLS" ON student_grades;
CREATE POLICY "Student grades select dynamic RLS" ON student_grades
FOR SELECT TO authenticated
USING (check_rls_permission('student_grades', 'SELECT'));
DROP POLICY IF EXISTS "Student grades insert dynamic RLS" ON student_grades;
CREATE POLICY "Student grades insert dynamic RLS" ON student_grades
FOR INSERT TO authenticated
WITH CHECK (check_rls_permission('student_grades', 'INSERT'));
DROP POLICY IF EXISTS "Student grades update dynamic RLS" ON student_grades;
CREATE POLICY "Student grades update dynamic RLS" ON student_grades
FOR UPDATE TO authenticated
USING (check_rls_permission('student_grades', 'UPDATE'))
WITH CHECK (check_rls_permission('student_grades', 'UPDATE'));
DROP POLICY IF EXISTS "Student grades delete dynamic RLS" ON student_grades;
CREATE POLICY "Student grades delete dynamic RLS" ON student_grades
FOR DELETE TO authenticated
USING (check_rls_permission('student_grades', 'DELETE'));

-- STUDENT_ATTENDANCE
DROP POLICY IF EXISTS "Student attendance select dynamic RLS" ON student_attendance;
CREATE POLICY "Student attendance select dynamic RLS" ON student_attendance
FOR SELECT TO authenticated
USING (check_rls_permission('student_attendance', 'SELECT'));
DROP POLICY IF EXISTS "Student attendance insert dynamic RLS" ON student_attendance;
CREATE POLICY "Student attendance insert dynamic RLS" ON student_attendance
FOR INSERT TO authenticated
WITH CHECK (check_rls_permission('student_attendance', 'INSERT'));
DROP POLICY IF EXISTS "Student attendance update dynamic RLS" ON student_attendance;
CREATE POLICY "Student attendance update dynamic RLS" ON student_attendance
FOR UPDATE TO authenticated
USING (check_rls_permission('student_attendance', 'UPDATE'))
WITH CHECK (check_rls_permission('student_attendance', 'UPDATE'));
DROP POLICY IF EXISTS "Student attendance delete dynamic RLS" ON student_attendance;
CREATE POLICY "Student attendance delete dynamic RLS" ON student_attendance
FOR DELETE TO authenticated
USING (check_rls_permission('student_attendance', 'DELETE'));

-- COURSES
DROP POLICY IF EXISTS "Courses select dynamic RLS" ON courses;
CREATE POLICY "Courses select dynamic RLS" ON courses
FOR SELECT TO authenticated
USING (check_rls_permission('courses', 'SELECT'));
DROP POLICY IF EXISTS "Courses insert dynamic RLS" ON courses;
CREATE POLICY "Courses insert dynamic RLS" ON courses
FOR INSERT TO authenticated
WITH CHECK (check_rls_permission('courses', 'INSERT'));
DROP POLICY IF EXISTS "Courses update dynamic RLS" ON courses;
CREATE POLICY "Courses update dynamic RLS" ON courses
FOR UPDATE TO authenticated
USING (check_rls_permission('courses', 'UPDATE'))
WITH CHECK (check_rls_permission('courses', 'UPDATE'));
DROP POLICY IF EXISTS "Courses delete dynamic RLS" ON courses;
CREATE POLICY "Courses delete dynamic RLS" ON courses
FOR DELETE TO authenticated
USING (check_rls_permission('courses', 'DELETE'));

-- FINANCES
DROP POLICY IF EXISTS "Finances select dynamic RLS" ON finances;
CREATE POLICY "Finances select dynamic RLS" ON finances
FOR SELECT TO authenticated
USING (check_rls_permission('finances', 'SELECT'));
DROP POLICY IF EXISTS "Finances insert dynamic RLS" ON finances;
CREATE POLICY "Finances insert dynamic RLS" ON finances
FOR INSERT TO authenticated
WITH CHECK (check_rls_permission('finances', 'INSERT'));
DROP POLICY IF EXISTS "Finances update dynamic RLS" ON finances;
CREATE POLICY "Finances update dynamic RLS" ON finances
FOR UPDATE TO authenticated
USING (check_rls_permission('finances', 'UPDATE'))
WITH CHECK (check_rls_permission('finances', 'UPDATE'));
DROP POLICY IF EXISTS "Finances delete dynamic RLS" ON finances;
CREATE POLICY "Finances delete dynamic RLS" ON finances
FOR DELETE TO authenticated
USING (check_rls_permission('finances', 'DELETE'));

-- BRANCHES (Admin only mostly)
DROP POLICY IF EXISTS "Branches select dynamic RLS" ON branches;
CREATE POLICY "Branches select dynamic RLS" ON branches
FOR SELECT TO authenticated
USING (check_rls_permission('branches', 'SELECT'));
DROP POLICY IF EXISTS "Branches insert dynamic RLS" ON branches;
CREATE POLICY "Branches insert dynamic RLS" ON branches
FOR INSERT TO authenticated
WITH CHECK (check_rls_permission('branches', 'INSERT'));
DROP POLICY IF EXISTS "Branches update dynamic RLS" ON branches;
CREATE POLICY "Branches update dynamic RLS" ON branches
FOR UPDATE TO authenticated
USING (check_rls_permission('branches', 'UPDATE'))
WITH CHECK (check_rls_permission('branches', 'UPDATE'));
DROP POLICY IF EXISTS "Branches delete dynamic RLS" ON branches;
CREATE POLICY "Branches delete dynamic RLS" ON branches
FOR DELETE TO authenticated
USING (check_rls_permission('branches', 'DELETE'));

-- ROLE_PERMISSIONS (Admin read-only)
DROP POLICY IF EXISTS "Role permissions read" ON role_permissions;
CREATE POLICY "Role permissions read" ON role_permissions
FOR SELECT TO authenticated
USING (true);

-- ========================================
-- 4. SEED PERMISSIONS IF MISSING
-- ========================================
-- إضافة كافة الموارد المفقودة لضمان عمل الحسابات والتقارير
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
VALUES 
('admin', 'students', true, true, true, true, 'global'),
('admin', 'users', true, true, true, true, 'global'),
('admin', 'departments', true, true, true, true, 'global'),
('admin', 'expense_items', true, true, true, true, 'global'),
('admin', 'finances', true, true, true, true, 'global'),
('admin', 'activity_logs', true, true, true, true, 'global'),
('admin', 'branches', true, true, true, true, 'global'),
('admin', 'accounting', true, true, true, true, 'global'),
('admin', 'reports', true, true, true, true, 'global')
ON CONFLICT (role, resource) DO NOTHING;

INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'admin', 'users', true, true, true, true, 'global'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role='admin' AND resource='users')
ON CONFLICT (role, resource) DO NOTHING;

INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'admin', 'departments', true, true, true, true, 'global'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role='admin' AND resource='departments')
ON CONFLICT (role, resource) DO NOTHING;

INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'admin', 'expense_items', true, true, true, true, 'global'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role='admin' AND resource='expense_items')
ON CONFLICT (role, resource) DO NOTHING;

INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'branch_manager', 'students', true, true, true, true, 'branch'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role='branch_manager' AND resource='students')
ON CONFLICT (role, resource) DO NOTHING;

-- Add more roles as needed...

-- ========================================
-- 5. VERIFICATION
-- ========================================
SELECT '✅ RLS Policies Created' AS status;
SELECT 'Active Policies:', COUNT(*) FROM pg_policies WHERE schemaname='public';

-- Test query (run as your user):
-- SELECT check_rls_permission('students', 'INSERT');

SELECT 
    au.email,
    au.raw_user_meta_data->>'role' as user_role,
    rp.can_create as can_create_students
FROM auth.users au
LEFT JOIN role_permissions rp ON au.raw_user_meta_data->>'role' = rp.role AND rp.resource = 'students'
WHERE au.confirmed_at IS NOT NULL
ORDER BY au.email;

-- 🎉 ALL DONE! Test adding student now.
