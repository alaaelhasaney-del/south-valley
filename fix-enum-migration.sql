-- Fix: Add 'general_manager' to user_role enum
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/vtgwvjljyqjatzomebhm/sql

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'general_manager';

-- Verify success (should include general_manager)
SELECT unnest(enum_range(NULL::user_role)) AS valid_roles 
ORDER BY valid_roles;

-- Expected output:
--  admin
--  branch_manager
--  employee
--  general_manager  
--  teacher

-- Test: Should now succeed
-- INSERT INTO users (name, email, password_hash, role) VALUES ('Test GM', 'test@acad.com', 'hash', 'general_manager');

