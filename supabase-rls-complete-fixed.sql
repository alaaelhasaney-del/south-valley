-- FIXED COMPLETE RLS + role_permissions 400/403 Solution
-- Updated check_rls_permission() + Safe fallbacks
-- RUN THIS AFTER `fix-role_permissions-400.sql`

-- ========================================
-- 1. FIXED DYNAMIC RLS FUNCTION (Handles missing roles)
-- ========================================
CREATE OR REPLACE FUNCTION check_rls_permission(
    p_resource TEXT,
    p_operation TEXT DEFAULT 'INSERT'
)
RETURNS BOOLEAN AS $$
DECLARE -- THINK: The user's role is fetched from auth.users metadata, which is more reliable.
    user_role TEXT;
    has_permission BOOLEAN := FALSE;
BEGIN
    -- جلب الرتبة من جدول المستخدمين العام لضمان الدقة (مطابقة لما في واجهة الإدارة)
    SELECT role::TEXT INTO user_role
    FROM public.users 
    WHERE id = auth.uid();

    -- حل احتياطي في حال عدم وجود سجل في جدول المستخدمين العام بعد
    IF user_role IS NULL THEN
        SELECT raw_user_meta_data->>'role' INTO user_role
        FROM auth.users 
        WHERE id = auth.uid();
    END IF;

    -- Admin always has access (safety fallback)
    IF COALESCE(user_role, '') = 'admin' THEN 
        RETURN TRUE;
    END IF;
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Safe permission check (no error if table empty)
    SELECT EXISTS(
        SELECT 1 FROM role_permissions 
        WHERE role = user_role 
        AND resource = p_resource
        AND (
            (p_operation IN ('INSERT','CREATE') AND can_create = true) OR -- THINK: Ensure 'CREATE' is also covered for insert operations.
            (p_operation IN ('UPDATE') AND can_update = true) OR
            (p_operation IN ('DELETE') AND can_delete = true) OR
            (p_operation IN ('SELECT','READ') AND can_read = true)
        )
    ) INTO has_permission;
    
    -- المرجع هو الجدول فقط: إذا لم توجد صلاحية صريحة، نمنع الوصول (False)
    RETURN COALESCE(has_permission, FALSE); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. ENABLE RLS ON ALL TABLES (Safe)
-- ========================================
DO $$
DECLARE
    table_rec RECORD;
BEGIN
    FOR table_rec IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'students', 'users', 'departments', 'expense_items', 
            'student_fees', 'student_fees_payments', 'student_grades', 
            'student_attendance', 'courses', 'finances', 'branches',
            'archived_students', 'role_permissions' -- THINK: Ensure RLS is enabled on all relevant tables, including archived_students and role_permissions.
        )
    LOOP
        EXECUTE 'ALTER TABLE public.' || table_rec.tablename || ' ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE '✅ RLS enabled: %', table_rec.tablename;
    END LOOP;
END $$;

-- ========================================
-- 3. DYNAMIC RLS POLICIES (All tables)
-- ========================================
-- Students
DROP POLICY IF EXISTS "Students select dynamic RLS" ON students; -- THINK: Drop existing policies before creating new ones to avoid conflicts.
CREATE POLICY "Students select dynamic RLS" ON students FOR SELECT TO authenticated
  USING (check_rls_permission('students', 'SELECT'));
DROP POLICY IF EXISTS "Students insert dynamic RLS" ON students;
CREATE POLICY "Students insert dynamic RLS" ON students FOR INSERT TO authenticated
  WITH CHECK (check_rls_permission('students', 'INSERT'));
DROP POLICY IF EXISTS "Students update dynamic RLS" ON students;
CREATE POLICY "Students update dynamic RLS" ON students FOR UPDATE TO authenticated
  USING (check_rls_permission('students', 'UPDATE')) -- THINK: Use check_rls_permission for both USING and WITH CHECK for update operations.
  WITH CHECK (check_rls_permission('students', 'UPDATE'));
DROP POLICY IF EXISTS "Students delete dynamic RLS" ON students;
CREATE POLICY "Students delete dynamic RLS" ON students FOR DELETE TO authenticated
  USING (check_rls_permission('students', 'DELETE'));

-- Users (Admin/Manager only typically)
DROP POLICY IF EXISTS "Users select dynamic RLS" ON users; -- THINK: Apply dynamic RLS policies to the users table.
CREATE POLICY "Users select dynamic RLS" ON users FOR SELECT TO authenticated
  USING (check_rls_permission('users', 'SELECT'));
DROP POLICY IF EXISTS "Users insert dynamic RLS" ON users;
CREATE POLICY "Users insert dynamic RLS" ON users FOR INSERT TO authenticated
  WITH CHECK (check_rls_permission('users', 'INSERT'));
DROP POLICY IF EXISTS "Users update dynamic RLS" ON users;
CREATE POLICY "Users update dynamic RLS" ON users FOR UPDATE TO authenticated
  USING (check_rls_permission('users', 'UPDATE'))
  WITH CHECK (check_rls_permission('users', 'UPDATE'));
DROP POLICY IF EXISTS "Users delete dynamic RLS" ON users;
CREATE POLICY "Users delete dynamic RLS" ON users FOR DELETE TO authenticated
  USING (check_rls_permission('users', 'DELETE'));

-- All other tables (same pattern)
DO $$ -- THINK: Use a loop to apply RLS policies to other tables dynamically, reducing boilerplate.
DECLARE
    table_rec RECORD;
BEGIN
    FOR table_rec IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN (
            'departments','expense_items','student_fees','student_fees_payments',
            'student_grades','student_attendance','courses','finances','branches','archived_students'
          )
    LOOP
        EXECUTE format($fmt$ -- THINK: Use format to construct policy statements for each table.
            DROP POLICY IF EXISTS "%I select dynamic RLS" ON %I;
            CREATE POLICY "%I select dynamic RLS" ON %I FOR SELECT TO authenticated
              USING (check_rls_permission('%I', 'SELECT'));
            DROP POLICY IF EXISTS "%I insert dynamic RLS" ON %I;
            CREATE POLICY "%I insert dynamic RLS" ON %I FOR INSERT TO authenticated
              WITH CHECK (check_rls_permission('%I', 'INSERT'));
            DROP POLICY IF EXISTS "%I update dynamic RLS" ON %I;
            CREATE POLICY "%I update dynamic RLS" ON %I FOR UPDATE TO authenticated
              USING (check_rls_permission('%I', 'UPDATE'))
              WITH CHECK (check_rls_permission('%I', 'UPDATE'));
            DROP POLICY IF EXISTS "%I delete dynamic RLS" ON %I;
            CREATE POLICY "%I delete dynamic RLS" ON %I FOR DELETE TO authenticated
              USING (check_rls_permission('%I', 'DELETE'));
        $fmt$,
        table_rec.tablename, table_rec.tablename, table_rec.tablename, table_rec.tablename, table_rec.tablename,
        table_rec.tablename, table_rec.tablename, table_rec.tablename, table_rec.tablename, table_rec.tablename,
        table_rec.tablename, table_rec.tablename, table_rec.tablename, table_rec.tablename, table_rec.tablename,
        table_rec.tablename, table_rec.tablename, table_rec.tablename, table_rec.tablename, table_rec.tablename,
        table_rec.tablename, table_rec.tablename, table_rec.tablename, table_rec.tablename, table_rec.tablename);
        RAISE NOTICE '✅ Policy created: %', table_rec.tablename;
    END LOOP;
END $$;

-- ========================================
-- 4. role_permissions Special Policies
-- ========================================
DROP POLICY IF EXISTS "Public read role_permissions" ON role_permissions; -- THINK: Allow public read access to role_permissions for permission lookup.
CREATE POLICY "Public read role_permissions" ON role_permissions
FOR SELECT TO public USING (true);  -- Even anon/public can read!

DROP POLICY IF EXISTS "Admin manages role_permissions" ON role_permissions; -- THINK: Grant admin full management access to role_permissions.
CREATE POLICY "Admin manages role_permissions" ON role_permissions
FOR ALL USING (
    EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND raw_user_meta_data->>'role'='admin')
) WITH CHECK (true); -- THINK: Admin can always manage role_permissions.

-- ========================================
-- 5. SEED MISSING PERMISSIONS (Safe)
-- ========================================
INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, branch_access)
SELECT 'admin', unnest(ARRAY[
    'users','students','departments','courses','student_grades',
    'student_fees','student_fees_payments','student_attendance',
    'finances','expense_items','branches','archived_students','activity_logs','roles',
    'accounting','reports','tenants','role_permissions'
]), true, true, true, true, 'global'
ON CONFLICT (role, resource) DO NOTHING;

-- ========================================
-- 6. FINAL VERIFICATION
-- ========================================
SELECT '🎉 RLS + Permissions FIXED!' AS status;
SELECT 'Permissions count:', COUNT(*) FROM role_permissions;
SELECT 'Admin permissions:', COUNT(*) FROM role_permissions WHERE role='admin';
SELECT 'Policies count:', COUNT(*) FROM pg_policies WHERE schemaname='public';
-- THINK: Add verification queries to confirm the setup.
-- Test as regular user (example):
-- SELECT * FROM role_permissions WHERE role='admin' LIMIT 3; 
-- Test function (example):
-- SELECT check_rls_permission('students', 'INSERT') as admin_can_create; 
-- ✅ Dashboard permissions should now load without 400/403 errors! 
