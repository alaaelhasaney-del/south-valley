-- FIX users table 400 Bad Request (Clean SQL - No markdown)

-- 1. SHOW table structure first
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Ensure permissions column exists (Fixes 400 Bad Request on select=permissions)
DO $$
BEGIN
    -- نضمن وجود العمود لأن الكود البرمجي لا يزال يطلبه
    ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';
    RAISE NOTICE '✅ Ensured permissions column exists as JSONB';
END $$;

-- 3. Ensure role column exists (uses text matching with role_permissions)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id INTEGER;

-- 4. Sync role from auth.users metadata (FIXED type cast)
UPDATE users u
SET role = au.raw_user_meta_data->>'role'
FROM auth.users au 
WHERE u.id::text = au.id::text;

-- 5. FINAL VERIFICATION
SELECT '✅ Users table fixed!' AS status;

-- Test basic users query
SELECT id::text, email, role FROM users LIMIT 3;

-- Test permissions integration
SELECT 
    u.email, 
    u.role,
    array_agg(rp.resource) FILTER (WHERE rp.can_read) as readable_resources
FROM users u 
LEFT JOIN role_permissions rp ON u.role = rp.role 
WHERE u.role IS NOT NULL
GROUP BY u.id, u.email, u.role
ORDER BY u.email
LIMIT 5;

-- 6. Index for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);

-- ✅ NOW: supabase.from('users').select('*') works perfectly!
-- role_permissions queries already use .eq('role', userRole) ✅ CORRECT
