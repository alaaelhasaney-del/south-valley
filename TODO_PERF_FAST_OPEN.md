# TODO - تحسين بطء فتح الصفحة

## Step 1 (أولوية عالية): PermissionsContext

- [ ] إزالة التأخير الاصطناعي 1 ثانية داخل `dashboard-electron/src/contexts/PermissionsContext.jsx`
- [ ] تقليل/إزالة `Promise.race` timeout داخل fetch permissions أو جعله باستخدام AbortController بدون تأخير ثابت
- [ ] تقليل console.log وقت التحميل

## Step 2: تحسين Sidebar

- [ ] memoization/تقليل re-render في `dashboard-electron/src/components/Sidebar.jsx`

## Step 3 (أولوية عالية لصفحة ثقيلة): Students

- [ ] تحسين حسابات fees داخل render عبر useMemo + feesByStudentId Map في `dashboard-electron/src/pages/Students.jsx`

## Step 4: قياس الأداء

- [ ] اختبار فتح التطبيق بعد تسجيل الدخول (زمن ظهور المحتوى)
- [ ] اختبار فتح Dashboard و Students
