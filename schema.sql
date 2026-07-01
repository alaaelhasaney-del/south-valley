-- Academy Management System Database Schema (PostgreSQL / Supabase compatible)
-- Run this in Supabase SQL editor or psql

-- Multi-Tenant SaaS Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants (Academies) table - كل أكاديمية مستقلة
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  subdomain VARCHAR(100) UNIQUE NOT NULL, -- academy1.app.com
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  logo_data TEXT,
  tax_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_active ON tenants(is_active);

-- Enum for user roles (RBAC)
CREATE TYPE user_role AS ENUM ('admin', 'general_manager', 'branch_manager', 'employee', 'teacher', 'muhasib');

-- Branches table
CREATE TABLE branches (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branches_tenant ON branches(tenant_id);

-- Users table (employees, managers) with RBAC and branch link
CREATE TABLE users (
  id UUID PRIMARY KEY, -- Adjusted to match Supabase Auth UUID
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  permissions JSONB DEFAULT '[]', -- Fixed 400 Bad Request
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- Students table
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  guardian_phone VARCHAR(20),
  governorate VARCHAR(100),
  city VARCHAR(100),
  full_address TEXT,
  national_id VARCHAR(20),
  qualification VARCHAR(100),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
class_year VARCHAR(50),
  photo_data TEXT,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_tenant ON students(tenant_id);

CREATE INDEX idx_students_department ON students(department_id);


-- Departments table
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL, -- Optional primary branch for compatibility
  branch_ids JSONB DEFAULT '[]', -- Added to match frontend request
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage departments" ON departments
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE TABLE department_branches (
  id SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(department_id, branch_id)
);

CREATE INDEX idx_department_branches_department ON department_branches(department_id);
CREATE INDEX idx_department_branches_branch ON department_branches(branch_id);

-- Courses table
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  duration INTERVAL, -- e.g. '3 months'
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_branch ON courses(branch_id);

-- Finances table (daily inventory per branch)
CREATE TABLE finances (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  revenue DECIMAL(12,2) DEFAULT 0,
  expenses DECIMAL(12,2) DEFAULT 0,
  cash_balance DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, date) -- One entry per branch per day
);

-- Indexes for performance
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_students_branch ON students(branch_id);
CREATE INDEX idx_finances_branch_date ON finances(branch_id, date);
CREATE INDEX idx_courses_dept ON courses(department_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_grades_updated_at BEFORE UPDATE ON student_grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_attendance_updated_at BEFORE UPDATE ON student_attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Expense Items table - بنود المصروفات
CREATE TABLE expense_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  class_year VARCHAR(50),
  amount DECIMAL(10,2) NOT NULL,
  is_mandatory BOOLEAN DEFAULT false,
  is_service BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expense_items_branch ON expense_items(branch_id);

CREATE INDEX idx_expense_items_dept_class ON expense_items(department_id, class_year);
CREATE TRIGGER update_expense_items_updated_at BEFORE UPDATE ON expense_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Student Fees - مصروفات الطالب
CREATE TABLE student_fees (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  expense_item_id INTEGER REFERENCES expense_items(id) ON DELETE CASCADE,
  is_selected BOOLEAN DEFAULT true,
  amount_due DECIMAL(10,2),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  remaining_balance DECIMAL(10,2) GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  due_date DATE,
  paid_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_fees_branch ON student_fees(branch_id);

CREATE INDEX idx_student_fees_student ON student_fees(student_id);
CREATE INDEX idx_student_fees_status ON student_fees(status);

-- Student Fees Payments - سجل عمليات التحصيل
CREATE TABLE IF NOT EXISTS student_fees_payments (
  id SERIAL PRIMARY KEY,
  fee_id INTEGER NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  paid_by UUID REFERENCES auth.users(id),
  payment_method VARCHAR(50) DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student grades table
CREATE TABLE student_grades (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course VARCHAR(255) NOT NULL,
  grade VARCHAR(50),
  comment TEXT,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_grades_branch ON student_grades(branch_id);

CREATE INDEX idx_student_grades_student ON student_grades(student_id);

-- Student attendance table
CREATE TABLE student_attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_student_attendance_branch ON student_attendance(branch_id);

CREATE INDEX idx_student_attendance_student ON student_attendance(student_id);

-- Sample data
INSERT INTO branches (name, location) VALUES 
('Main Branch', 'Downtown'),
('Branch 2', 'Suburb');

INSERT INTO users (name, email, password_hash, role, branch_id) VALUES 
('Admin User', 'admin@example.com', '$2b$10$hashedpass', 'admin', 1);

-- Sample expense items
INSERT INTO departments (name) VALUES ('اللغة العربية'), ('الرياضيات');
INSERT INTO expense_items (name, department_id, class_year, amount, is_mandatory, is_service, description) VALUES
('كتاب الرياضيات', 2, 'الأولى', 150.00, true, false, 'الكتاب الدراسي الرسمي'),
('حصة خصوصية', 1, 'الثانية', 200.00, false, true, 'حصة خصوصية أسبوعية'),
('رسوم تسجيل', NULL, NULL, 500.00, true, false, 'رسوم التسجيل الابتدائية');

-- End of schema
