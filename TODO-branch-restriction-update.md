# TODO: تطبيق نظام الأفرع (منع ظهور بيانات غير فرع المستخدم)

## Step 1: Fix branches fetch + validation

- File: dashboard-electron/src/dataService.js
- Ensure getBranches() always returns an Array
- Validate JSON response type

## Step 2: Fix Students modal branch selector UX

- File: dashboard-electron/src/pages/Students.jsx
- Use separate loading state for branches
- Disable branch selection UI while branches are loading
- Ensure branch_ids set correctly for non-admin users

## Step 3: (بعد ما ننجح UX) راجع باقي صفحات البيانات

- Pages likely: Finances.jsx, StudentFeesPayment.jsx, StudentGrades.jsx, etc.
- Confirm all data queries are filtered by branch/tenant for non-admin users.
