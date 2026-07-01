# Supabase Migration Progress

## ✅ Completed

- [x] Fixed seed-roles-complete.sql ON CONFLICT error
- [x] Created setup-role-permissions-complete.sql (table + function + seed)
- [ ] Convert React files: axios → supabase-js

## React Files Queue (5 total)

1. ActivityLogs.jsx → **In Progress**
2. Accounting.jsx
3. Reports.jsx
4. Print.jsx
5. ReportsWrapper.jsx

## Run These Commands

```bash
# 1. Run SQL
# Copy setup-role-permissions-complete.sql to Supabase SQL Editor → Execute

# 2. Install Supabase client (in dashboard-electron/)
cd dashboard-electron
npm i @supabase/supabase-js

# 3. Dev server
npm run dev
```

## Test Commands (Supabase SQL)

```sql
SELECT * FROM get_roles_list();
SELECT role, COUNT(*) FROM role_permissions GROUP BY role;
```
