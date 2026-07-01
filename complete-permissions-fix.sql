-- Complete RLS Policies for Academy Management
-- Run in Supabase SQL Editor

-- 1. Enable RLS on ALL tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- 2. Students: Branch Manager/Employee see only THEIR branch
CREATE POLICY "Branch users see own branch students" ON students
FOR ALL USING (
  tenant_id = current_setting('app.current_tenant')::integer
  AND (
    auth.role() = 'admin' OR
    branch_id = current_setting('app.current_branch')::integer OR
    branch_id IS NULL -- Shared students
  )
);

-- 3. Finances: Branch-specific
CREATE POLICY "Branch finances access" ON finances
FOR ALL USING (
  tenant_id = current_setting('app.current_tenant')::integer
  AND (
    auth.role() = 'admin' OR
    branch_id = current_setting('app.current_branch')::integer
  )
);

-- 4. Users: Admins see all, others see branch users
CREATE POLICY "Users branch access" ON users
FOR ALL USING (
  tenant_id = current_setting('app.current_tenant')::integer
  AND (
    auth.role() = 'admin' OR
    branch_id = current_setting('app.current_branch')::integer OR
    branch_id IS NULL
  )
);

-- 5. Student Fees: Match student branch
CREATE POLICY "Student fees branch match" ON student_fees
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = student_fees.student_id 
    AND (auth.role() = 'admin' OR s.branch_id = current_setting('app.current_branch')::integer)
  )
);

-- 6. Grades/Attendance: Student branch match
CREATE POLICY "Student data branch match" ON student_grades
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = student_grades.student_id 
    AND (auth.role() = 'admin' OR s.branch_id = current_setting('app.current_branch')::integer)
  )
);

CREATE POLICY "Attendance branch match" ON student_attendance
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = student_attendance.student_id 
    AND (auth.role() = 'admin' OR s.branch_id = current_setting('app.current_branch')::integer)
  )
);

-- 7. Branches: Admins only modify
CREATE POLICY "Branches admin only" ON branches
FOR SELECT, INSERT, UPDATE, DELETE USING (auth.role() = 'admin');

-- 8. Departments/Courses: Branch managers + admins
CREATE POLICY "Departments branch access" ON departments
FOR ALL USING (
  auth.role() IN ('admin', 'branch_manager') OR
  branch_id = current_setting('app.current_branch')::integer
);

-- Set default values for app context (in server.js connection)
ALTER DATABASE your_db SET app.current_tenant TO '1';
ALTER DATABASE your_db SET app.current_branch TO '1';

-- Test
-- SELECT * FROM students; -- Should show only branch students

COMMIT;
