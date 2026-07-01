# ✅ إصلاح department_id فارغ في student_fees (صفحة الطلاب) - **تم الإصلاح**

## تم الحل:

- ✅ Added `department_id: Number(studentData.department_id)` to both `feesToInsert.push()` calls (single fee + installments loop).

## التحقق:

- Add new student → Check DB: `student_fees` now has `department_id`.
- Expenses sync works with dept filter.

**Status: Complete**
