-- Essential Tables for Expenses Feature (Run in Supabase SQL Editor)

-- Expense Items Table
CREATE TABLE IF NOT EXISTS expense_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  class_year VARCHAR(50),
  amount DECIMAL(10,2) NOT NULL,
  is_mandatory BOOLEAN DEFAULT false,
  is_service BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_expense_items_dept_class ON expense_items(department_id, class_year);

-- Sample data
INSERT INTO expense_items (name, amount, is_mandatory, description) VALUES 
('رسوم تسجيل', 500.00, true, 'رسوم التسجيل الأساسية'),
('كتب دراسية', 250.00, true, 'كتب الفصل الدراسي'),
('حصص خصوصية', 200.00, false, true, 'حصص اختيارية');

-- Verify
SELECT * FROM expense_items LIMIT 5;

