-- Fixed Version: PostgreSQL/Supabase 42601 Syntax Error Resolved
-- Run in Supabase SQL Editor

-- 1. Create daily_expenses if missing
CREATE TABLE IF NOT EXISTS daily_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  date DATE NOT NULL,
  tenant_id INTEGER REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(branch_id, date, name)
);

CREATE INDEX IF NOT EXISTS idx_daily_expenses_branch_date ON daily_expenses (branch_id, date);

-- 2. Safe cleanup: Fix only corrupted branch_id (arrays/strings)
DO $$
BEGIN
  UPDATE finances 
  SET branch_id = NULL
  WHERE branch_id IS NOT NULL AND (branch_id::TEXT ~ '^\[' OR branch_id::TEXT ~ '\]$' OR branch_id !~ '^[0-9]+$');
  
  UPDATE expense_items 
  SET branch_id = NULL
  WHERE branch_id IS NOT NULL AND (branch_id::TEXT ~ '^\[' OR branch_id::TEXT ~ '\]$' OR branch_id !~ '^[0-9]+$');
  
  UPDATE daily_expenses 
  SET branch_id = NULL
  WHERE branch_id IS NOT NULL AND (branch_id::TEXT ~ '^\[' OR branch_id::TEXT ~ '\]$' OR branch_id !~ '^[0-9]+$');
  
  UPDATE students SET branch_id = NULL WHERE branch_id IS NOT NULL AND branch_id::TEXT !~ '^[0-9]+$';
  UPDATE users SET branch_id = NULL WHERE branch_id IS NOT NULL AND branch_id::TEXT !~ '^[0-9]+$';
END $$;

-- 3. Validate (run these SELECTs manually)
-- SELECT count(*) FROM finances WHERE branch_id::TEXT ~ '^\[|\]';
-- SELECT count(*) FROM daily_expenses WHERE branch_id::TEXT ~ '^\[|\]';

-- SUCCESS: 0 rows above = FIXED. Refresh app.
