# TODO: حل FK users_id_fkey عبر RLS

## الهدف

منع أي `INSERT/UPDATE` مباشر على `public.users` من خلال Supabase REST من frontend، لأن الـ FK مربوط بـ `auth.users(id)` ويؤدي لخطأ 23503.

## الخطوات

1. مراجعة policies الحالية لـ public.users (قراءة فقط حالياً).
2. إضافة policy/deny صريح يمنع `INSERT/UPDATE/DELETE` من roles غير service_role.
3. التأكد أن السيرفر (باستخدام service role) قادر على INSERT/UPDATE.
4. إعادة اختبار إضافة المستخدم من صفحة الإضافة.

## Query مقترحة للبدء (نفذها في Supabase SQL Editor)

- [ ] إنشاء/تعديل سياسة تمنع الكتابة
- [ ] أو تعطيل RLS مؤقتاً/ثم تفعيلها مع deny/allow الصحيح
