-- مثال سياسة RLS لجدول المصروفات (expense_items)
-- تمنع التعديل إلا إذا كان لدى المستخدم صلاحية can_update على 'expense_items'
-- استخدمها في Supabase SQL Editor بعد إنشاء الجدول

-- تفعيل RLS على الجدول (إذا لم يكن مفعلاً)
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

-- سياسة شاملة لجميع العمليات بناءً على الصلاحيات
CREATE POLICY "Dynamic expense_items access via role_permissions" ON expense_items
FOR ALL 
TO authenticated
USING (
  -- التحقق من صلاحية القراءة للـ SELECT
  (SELECT CASE 
    WHEN tg_op = 'SELECT' THEN rp.can_read
    WHEN tg_op IN ('INSERT', 'UPDATE') THEN rp.can_create OR rp.can_update
    WHEN tg_op = 'DELETE' THEN rp.can_delete
    ELSE false
  END 
  FROM role_permissions rp, auth.users au
  WHERE au.id = auth.uid() 
  AND au.raw_user_meta_data->>'role' = rp.role
  AND rp.resource = 'expense_items'
  LIMIT 1) = true
)
WITH CHECK (
  -- نفس الشروط للكتابة (INSERT/UPDATE)
  (SELECT CASE 
    WHEN tg_op IN ('INSERT', 'UPDATE') THEN rp.can_create OR rp.can_update
    ELSE false
  END 
  FROM role_permissions rp, auth.users au
  WHERE au.id = auth.uid() 
  AND au.raw_user_meta_data->>'role' = rp.role
  AND rp.resource = 'expense_items'
  LIMIT 1) = true
);

-- سياسة بسيطة للقراءة فقط (اختيارية)
CREATE POLICY "expense_items read access" ON expense_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM role_permissions rp, auth.users au 
    WHERE au.id = auth.uid() 
    AND au.raw_user_meta_data->>'role' = rp.role 
    AND rp.resource = 'expense_items' 
    AND rp.can_read = true
  )
);

-- التحقق من السياسات
SELECT * FROM pg_policies WHERE tablename = 'expense_items';

-- مثال استخدام: اختبار الصلاحيات
-- INSERT INTO expense_items (...) -- سيتحقق الـ RLS تلقائياً
