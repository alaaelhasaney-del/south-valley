-- إضافة حقول طباعة الإيصال لجدول student_fees
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS is_printed BOOLEAN DEFAULT FALSE;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS printed_by INTEGER REFERENCES auth.users(id);

-- إنشاء دالة RPC لتحديث حالة الطباعة
CREATE OR REPLACE FUNCTION print_receipt(fee_id INTEGER, user_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE student_fees 
  SET is_printed = TRUE, printed_by = user_id, updated_at = NOW()
  WHERE id = fee_id AND (is_printed = FALSE OR EXISTS (
    SELECT 1 FROM auth.users u 
    JOIN roles r ON u.role = r.name 
    WHERE u.id = user_id AND r.permissions @> ARRAY['admin']
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policy لمنع الطباعة المتكررة لغير الأدمن
CREATE POLICY "Allow admin to print anytime" ON student_fees 
FOR UPDATE USING (is_printed = FALSE OR EXISTS (
  SELECT 1 FROM auth.users u 
  JOIN roles r ON u.role = r.name 
  WHERE u.id = auth.uid() AND r.permissions @> ARRAY['admin']
));

COMMENT ON TABLE student_fees IS 'جدول رسوم الطلاب مع دعم طباعة إيصال مرة واحدة';

