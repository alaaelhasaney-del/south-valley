-- V3: Fixed 42883 Operator Error (bigint !~ text) - Safe Cleanup
-- Test first, then update

-- 0. Test for corruption (run first, report count)
SELECT 'finances corrupted' as table_name, count(*) as bad_rows 
FROM finances WHERE branch_id::text ~ '^\[|\]' OR branch_id::text ~ '\]$';

SELECT 'daily_expenses corrupted' as table_name, count(*) as bad_rows 
FROM daily_expenses WHERE branch_id::text ~ '^\[|\]' OR branch_id::text ~ '\]$';

SELECT 'expense_items corrupted' as table_name, count(*) as bad_rows 
FROM expense_items WHERE branch_id::text ~ '^\[|\]' OR branch_id::text ~ '\]$';

-- 1. Create table if missing
CREATE TABLE IF NOT EXISTS daily_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  date DATE NOT NULL,
  tenant_id INTEGER,
  created_at TIMESTAMP DEFAULT now()
);

-- 2. Cleanup: Safe for UUID/INTEGER/NUMERIC branch_id - detect invalid arrays/strings
UPDATE finances 
SET branch_id = NULL 
WHERE branch_id::text ~ '^\[|\]' OR branch_id::text ~ '\]$' OR length(branch_id::text) > 20 OR NOT (branch_id::text ~ '^[0-9]+$');

UPDATE daily_expenses 
SET branch_id = NULL 
WHERE branch_id::text ~ '^\[|\]' OR branch_id::text ~ '\]$' OR length(branch_id::text) > 20 OR NOT (branch_id::text ~ '^[0-9]+$');

UPDATE expense_items 
SET branch_id = NULL 
WHERE branch_id::text ~ '^\[|\]' OR branch_id::text ~ '\]$' OR length(branch_id::text) > 20 OR NOT (branch_id::text ~ '^[0-9]+$');

-- 3. Re-test
SELECT 'POST-FIX finances bad' as table_name, count(*) as bad_rows 
FROM finances WHERE branch_id::text ~ '^\[|\]' OR branch_id::text ~ '\]$' OR NOT (branch_id::text ~ '^[0-9]+$');

-- Expected: 0 rows everywhere = FIXED. Refresh Finances.jsx.
