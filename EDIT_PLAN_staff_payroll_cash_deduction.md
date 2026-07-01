# خطة تنفيذ: عرض «صافى مرتب الموظف» + زر خصم من المصروفات اليومية

## 1) المعلومات المتاحة من repo

- `dashboard-electron/src/pages/staff_payroll.sql`
  - View: `public.employee_payroll_monthly_summary`
  - تحسب `net_total` من:
    - employee_payroll_items (basic/allowance/deduction)
    - employee_penalties (deduction)
    - employee_rewards (allowance)
- `dashboard-electron/src/dataService.js`
  - `addExpense(expenseData)`:
    - insert في `daily_expenses`
    - ثم `refreshFinanceSummary(branch_id, date, tenant_id)`
    - بالتالي `finances.cash_balance` يتأثر.

## 2) التعديلات في `dashboard-electron/src/pages/StaffAffairs.jsx`

### A) UI

- إضافة state:
  - `selectedMonth` (default: current month)
  - `payrollRows` (نتائج summary)
  - `payrollLoading`, `payrollError`
- إضافة استعلام للشهر:
  - تحويل قيمة input month (YYYY-MM) إلى تاريخ أول يوم: `YYYY-MM-01`
- إضافة جدول يعرض لكل عامل:
  - name
  - net_total
  - زر: `خصم من المصروفات اليومية`

### B) Data fetch

- تحميل `payrollRows` من view `employee_payroll_monthly_summary`
  - مع `month = selectedMonthAsDate`
  - وتجهيز (أ) join بسيط مع employees لاسم العامل إن لم تكن View تعرض name
  - وتجهيز (ب) tenant/branch filters إن لزم

### C) Handler (عند الضغط)

- عند الضغط على زر الخصم:
  - قيمة المصروف = `net_total`
  - `branch_id` من employee (أو branch مناسب)
  - `date` = أول يوم في الشهر (أو نفس الشهر حسب تصميم `daily_expenses` عندك)
  - `notes`/`description`: نص يربط الموظف + الشهر
- نستدعي من داخل الـ page مباشرة (عبر supabase إن لم نستخدم dataService) أو نستخدم `addExpense` لو متاح import.

## 3) Dependent files (قد تحتاج تعديل إذا استدعاء dataService مطلوب)

- `dashboard-electron/src/pages/StaffAffairs.jsx`
- (اختياري) `dashboard-electron/src/dataService.js` لو احتجنا Export واضح لـ `addExpense` أو default fields.

## 4) كونسيدرشنات

- لازم التأكد من schema أعمدة `daily_expenses` (خصوصًا: branch_id, date, amount, tenant_id, notes/description) قبل إدخال.

## 5) Testing steps

- إدخال employee*payroll*\* لبند الشهر للحصول على net_total
- فتح StaffAffairs
- اختيار نفس الشهر
- الضغط على زر الخصم
- التأكد من انخفاض `finances.cash_balance` بعد refresh.
