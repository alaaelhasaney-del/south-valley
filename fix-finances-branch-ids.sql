-- Fix PostgreSQL 22P02 Error: Cleanup branch_id corruption in academy-management-system
-- Run ALL in Supabase SQL Editor (safe, idempotent where possible)

-- 1. Create daily_expenses table if missing (used in Finances.jsx)
CREATE TABLE IF NOT EXISTS public.daily_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  date DATE NOT NULL,
  tenant_id INTEGER REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, date, name) -- Prevent duplicate daily items
);

-- Indexes for performance (Finances.jsx queries)
CREATE INDEX IF NOT EXISTS idx_daily_expenses_branch_date ON daily_expenses(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_tenant ON daily_expenses(tenant_id);

-- 2. Fix corrupted branch_id columns (convert JSON arrays to first int or NULL)
-- finances table
UPDATE finances 
SET branch_id = (string_to_array(branch_id::TEXT, ',')::INTEGER[])[1] 
WHERE branch_id::TEXT ~ '^\[|\]' OR branch_id !~ '^[0-9]+$';

-- expense_items table (has both branch_id INT and branch_ids JSONB)
UPDATE expense_items 
SET branch_id = COALESCE(
  (branch_ids::JSONB #>> '{}')::TEXT::INTEGER, 
  (string_to_array(branch_id::TEXT, ',')::INTEGER[])[1]
)
WHERE branch_id::TEXT ~ '^\[|\]' OR branch_id !~ '^[0-9]+$';

-- Add daily_expenses fix (if corrupted)
UPDATE daily_expenses 
SET branch_id = (string_to_array(branch_id::TEXT, ',')::INTEGER[])[1] 
WHERE branch_id::TEXT ~ '^\[|\]' OR branch_id !~ '^[0-9]+$';

-- Fix other tables (students, users, etc. - precautionary)
UPDATE students SET branch_id = (string_to_array(branch_id::TEXT, ',')::INTEGER[])[1] WHERE branch_id::TEXT ~ '^\[|\]' OR branch_id !~ '^[0-9]+$';
UPDATE users SET branch_id = (string_to_array(branch_id::TEXT, ',')::INTEGER[])[1] WHERE branch_id::TEXT ~ '^\[|\]' OR branch_id !~ '^[0-9]+$';

-- 3. Add NOT NULL constraints where safe (after cleanup)
ALTER TABLE finances ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE daily_expenses ALTER COLUMN branch_id SET NOT NULL;

-- 4. Validate (run SELECTs to check remaining issues)
-- SELECT * FROM finances WHERE branch_id::TEXT ~ '^\[|\]'; -- Should be 0 rows
-- SELECT * FROM daily_expenses WHERE branch_id::TEXT ~ '^\[|\]'; -- Should be 0 rows

-- 5. RLS Policy for safety (if not exists)
CREATE POLICY IF NOT EXISTS "Users can view own branch finances" ON finances
FOR SELECT TO authenticated USING (
  branch_id = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::INTEGER
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Success: Run above, then refresh Finances.jsx in app.
-- TODO: Update code to prevent future corruption (next steps)
