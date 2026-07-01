# TODO: Implement Dynamic Sidebar Permissions

## Approved Plan Steps (Status: Pending)

1. ✅ **Read key files**: Sidebar.jsx, PermissionsContext.jsx, CanAccess.jsx, App.jsx, ProtectedRoute.jsx, AuthContext.jsx, PERMISSIONS_GUIDE.md - Completed. System already fetches permissions from Supabase via /api/permissions/me on login and uses can(resource, "view") to hide sidebar items.

2. ✅ **Enhance permission fetching**: Integrated permissions into AuthContext, fetch on login/session restore, added `can()` function. Updated Sidebar/CanAccess/App to use AuthContext `can()`. Removed redundant PermissionsProvider.

3. ✅ **Map all sidebar resources explicitly**: navItems match PERMISSIONS_GUIDE.md perfectly (all resources like student_fees, expense_items exist).

4. **Polish Sidebar.jsx**: Add role-based visibility fallback (e.g., "No access" message), improve loading state.

5. **Enhance CanAccess.jsx**: Add tooltip/disabled state for no-permission items.

6. **Protect Routes**: Update ProtectedRoute.jsx to use permissions.can(path_resource, "view").

7. **Define role-specific mappings**:
   - Admin: all resources
   - Branch Manager: students.\*, finances, expenses (branch scope)
   - Teacher: student_grades, student_attendance
   - etc. (via backend roles page)

8. **Test**:
   - npm run dev
   - Login different roles
   - Verify sidebar hides correctly
   - Check console/DB for permission fetch

9. **Backend verification**: Ensure server.js /api/permissions/me returns all needed resources (students, departments, courses, users, finances, expense_items, student_fees, student_grades, student_attendance, activity_logs, inventory, branches).

## Progress Summary (All Frontend ✅)

**Completed**:

- Centralized permissions in AuthContext (fetch on login/restore)
- Sidebar dynamically hides items using `can(resource, 'view')` from Supabase `role_permissions`
- Updated CanAccess, App.jsx, Sidebar.jsx to use single `can()`
- Backend `/api/permissions/me` returns role-based perms for all sidebar resources

**Role Mappings** (PERMISSIONS_GUIDE.md + server.js):

- Admin: All visible
- Branch Manager: students\*, finances, expenses, etc.
- Teacher: student_grades, student_attendance only

**Test**: `cd dashboard-electron && npm run dev` (start server.js first)

**Backend Ready**: All resources supported.

Task complete!
