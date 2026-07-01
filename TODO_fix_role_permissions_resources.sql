-- Auto-fix: add missing resources used by Sidebar into role_permissions for Admin role.
-- IMPORTANT:
-- 1) Ensure you have an Admin role row in role_permissions.role (or adjust ROLE_NAME below).
-- 2) If you manage resources elsewhere, adapt this script.

-- Change this if your admin role name differs
DO $$
DECLARE
  ROLE_NAME text := 'admin';
  r text;
  resources text[] := ARRAY[
    'employees',
    'employee_payroll_monthly_summary',
    'student_grades_auto_columns',
    'student_grades_auto_columns_plan',
    'student_grades_auto_columns_legacy'
  ];
BEGIN
  -- Insert permission rows with full access for each resource, if not already present.
  FOREACH r IN ARRAY resources LOOP
    INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete)
    SELECT ROLE_NAME, r, true, true, true, true
    WHERE NOT EXISTS (
      SELECT 1 FROM role_permissions
      WHERE role = ROLE_NAME AND resource = r
    );
  END LOOP;
END $$;

-- Also: ensure wildcard resource '*' exists for admin if you prefer full access
-- (This is optional; comment out if you manage it elsewhere)
DO $$
BEGIN
  INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete)
  SELECT 'admin', '*', true, true, true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role = 'admin' AND resource = '*'
  );
END $$;

