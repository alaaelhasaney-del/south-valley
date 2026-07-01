-- RUN THIS IN SUPABASE SQL EDITOR (https://supabase.com/dashboard → SQL)
-- Fixes permissions table

ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'role_permissions';

-- Test
SELECT * FROM role_permissions LIMIT 5;

