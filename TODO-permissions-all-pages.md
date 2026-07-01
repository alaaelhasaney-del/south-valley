# TODO: Permissions Logic for ALL Pages ✅ Started (StudentGrades done)

## Goal: Apply same logic as StudentGrades to all pages

**Pattern**:

- Add `usePermissions()`
- `const canCreate = can('resource', 'create')`
- Buttons: `disabled={!can*} + styling + tooltip "صلاحية عرض فقط"`
- Conditional delete columns
- Save functions: permission check

## Priority Pages:

1. ✅ StudentGrades.jsx (done)
2. StudentAttendance.jsx (الغياب)
3. ✅ Departments.jsx (الاقسام)
4. Accounting.jsx (المحاسبه)
5. Finances.jsx (الماليه)
6. Others: Courses, Expenses, StudentFeesPayment, Students, Users

## Next Steps:

1. Analyze StudentAttendance.jsx
2. Apply changes
3. Repeat for each page
