# Enable Edit/Delete Roles - Follow-up Task

## Current Status

✅ POST /api/roles 400 fixed (regex mismatch)

## New Task: تفعيل أزرار تعديل الأدوار والحذف

**Roles.jsx Issues:**

```
✅ Create button/modal: Works
❌ Edit button: "تعديل" - no onClick handler
❌ Delete: No button/handler
```

**Plan (Step-by-step):**

1. **Frontend Roles.jsx:**
   - Add `handleEditRole(role)`: populate modal with existing name
   - Add `handleDeleteRole(role)`: confirmation + DELETE call
   - Add delete button (🗑️) next to edit
   - Modal: Show "تعديل دور" vs "دور جديد", PUT vs POST

2. **Backend server.js:**
   - `PUT /api/roles`: Rename role (ALTER TYPE RENAME VALUE)
   - `DELETE /api/roles`: Drop enum value + delete permissions

3. **Test flow:**
   - Create "accountant"
   - Edit → "account_mgr"
   - Delete "account_mgr"

## Priority Steps:

1. Add frontend handlers + buttons
2. Test with mock backend
3. Add backend endpoints

✅ **Frontend Complete**

```
- ✅ Edit button: handleEditRole() + modal
- ✅ Delete button: handleDeleteRole() + DELETE API
- ✅ Modal: Edit vs Create logic (PUT vs POST)
```

**Next:** Backend endpoints (server.js): Complete ✅

- ✅ DELETE /api/roles/:role
- ✅ PUT /api/roles/:oldRole (rename)

**Server restart needed** (kill node.exe first)

**Status:** Frontend buttons active, backend APIs pending
