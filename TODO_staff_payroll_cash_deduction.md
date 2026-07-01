# TODO: Staff payroll → خصم من المصروفات اليومية/الخزينة

## Goal

عند اختيار الشهر + عامل، يظهر «صافى مرتب الموظف» ويكون فيه زر عند الضغط عليه يقوم بإضافة مصروفات يومية بقيمة الصافي (وبالتالي cash_balance في finances يتحدث تلقائيًا).

## Background (موجودة في repo)

- `dashboard-electron/src/pages/staff_payroll.sql` ينشئ:
  - employee_payroll_items / employee_penalties / employee_rewards
  - View: `employee_payroll_monthly_summary` (فيه `net_total`)
- `dashboard-electron/src/dataService.js` ينشئ:
  - `addExpense(expenseData)` → insert في `daily_expenses` ثم `refreshFinanceSummary`

## Steps

1. تحديث UI في `dashboard-electron/src/pages/StaffAffairs.jsx`:
   - إضافة picker للشهر (type="month" تحوله لأول يوم شهر `YYYY-MM-01`)
   - تحميل summary من view `employee_payroll_monthly_summary` لكل employee (مع فلترة tenant/branches لو يلزم)
   - إضافة عمود: `net_total`
   - زر: «خصم من المصروفات اليومية/الخزينة» لكل موظف (أو زر إجمالي)
2. تنفيذ handler عند الضغط على الزر:
   - إنشاء record في `daily_expenses` عبر `addExpense` بالقيمة = `net_total`
   - استخدام `branch_id` و `date` (نفس يوم الشهر/مثلاً أول يوم)
   - text/notes: ربط بموظف + شهر
3. After insert:
   - `refreshFinanceSummary` يتم داخليًا من `addExpense` (لا نحتاج خطوة إضافية)
4. Permissions:
   - Ensure `CanAccess` أو resource permissions تسمح على الجداول:
     - employee_payroll_items, employee_penalties, employee_rewards
     - daily_expenses (أو مستخدم صفحة التخفيض)
5. Testing:
   - إضافة bonus/deductions لعامل لشهر
   - الضغط على زر الخصم
   - التأكد أن `finances.cash_balance` انخفض.
