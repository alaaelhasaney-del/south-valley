# TODO: Fix Supabase role_permissions 400/403 Error

Status: ✅ Step 1 Progress - `fix-role_permissions-400.sql` created!

## Plan Breakdown (Logical Steps)

### Step 1: ✅ Complete (Both SQL files run)

- ✅ `fix-role_permissions-400.sql`
- ✅ `supabase-rls-complete-fixed.sql`
- ✅ `users_permissions_400.sql` - **NEW: Fix users table 400**

### Step 2: Code Improvements

- [ ] Update `PermissionsContext.jsx` - Add error handling + fallback
- [ ] Test dashboard reload

### Step 3: Verification & Testing

- [ ] Test SELECT query as anon user
- [ ] Check dashboard permissions load
- [ ] Handle service_role if needed

### Step 4: Documentation

- [ ] Update README + TODO with success confirmation
- [ ] ✅ Complete task

**Next Action**:

1. **RUN `users_permissions_400.sql`** in Supabase (fixes users 400)
2. Refresh dashboard → Check console (students 403 should be fixed too)
3. Reply: "✅ Dashboard works" or new console errors
