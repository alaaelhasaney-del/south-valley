# Quality / Tests TODO

## المرحلة الحالية: Backend + Electron (dashboard-electron)

### [ ] 1) إعداد Quality Pipeline داخل `dashboard-electron`

- [ ] تثبيت devDependencies اللازمة لـ Vitest + Testing Library
- [x] إضافة ESLint + Prettier (مع إعدادات Config)
- [ ] إضافة scripts في `dashboard-electron/package.json`:
  - `lint`
  - `format`
  - `test:unit`
  - `test:watch`
  - `check:quality` (lint + unit + build)

### [ ] 2) إضافة أول Unit Tests (Smoke) لصفحات أساسية

- [ ] اختبار render الأساسي لـ `Students.jsx`
- [ ] اختبار render الأساسي لـ `Dashboard.jsx`

### [ ] 3) تشغيل تحقق محلي

- [ ] `cd dashboard-electron && npm test:unit`
- [ ] `cd dashboard-electron && npm run lint`
- [ ] `cd dashboard-electron && npm run build`
- [ ] `cd dashboard-electron && npm run check:quality`

### [ ] 4) تحديث عند الحاجة

- [ ] إذا فشلت الاختبارات بسبب الاعتماد على Supabase/RBAC → إضافة mocks.
