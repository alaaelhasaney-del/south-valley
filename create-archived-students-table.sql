-- Create archived_students archive table and enable RLS
-- If needed, this script also creates the helper function when missing.

CREATE OR REPLACE FUNCTION check_rls_permission(
    p_resource TEXT,
    p_operation TEXT DEFAULT 'INSERT'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    user_role TEXT;
    has_permission BOOLEAN := FALSE;
BEGIN
    SELECT COALESCE(raw_user_meta_data->>'role', 'staff') INTO user_role
    FROM auth.users
    WHERE id = auth.uid();

    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM role_permissions
        WHERE role = user_role
        AND resource = p_resource
        AND (
            (p_operation IN ('INSERT', 'CREATE') AND can_create = true) OR
            (p_operation IN ('UPDATE') AND can_update = true) OR
            (p_operation IN ('DELETE') AND can_delete = true) OR
            (p_operation IN ('SELECT', 'READ') AND can_read = true)
        )
    ) INTO has_permission;

    RETURN COALESCE(has_permission, (p_operation IN ('SELECT','READ')));
END;
$function$;

CREATE TABLE IF NOT EXISTS archived_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_name TEXT,
  national_id VARCHAR(20),
  department TEXT,
  total_grade TEXT,
  graduation_year INTEGER,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archived_students_tenant ON archived_students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_archived_students_national_id ON archived_students(national_id);
CREATE INDEX IF NOT EXISTS idx_archived_students_archived_at ON archived_students(archived_at);

ALTER TABLE archived_students ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON archived_students TO authenticated;

DROP POLICY IF EXISTS "Archived students select" ON archived_students;
CREATE POLICY "Archived students select" ON archived_students FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Archived students insert" ON archived_students;
CREATE POLICY "Archived students insert" ON archived_students FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Archived students update" ON archived_students;
CREATE POLICY "Archived students update" ON archived_students FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Archived students delete" ON archived_students;
CREATE POLICY "Archived students delete" ON archived_students FOR DELETE TO authenticated
  USING (true);
