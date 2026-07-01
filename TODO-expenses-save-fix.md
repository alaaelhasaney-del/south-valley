# Expenses.jsx Save Function Fix Plan

**Information Gathered:**

- Schema: expense_items(item_name text, branch_ids jsonb[], department_ids jsonb[], class_years jsonb[], amount numeric)
- Current code: cleanItemData uses 'name' but schema expects 'item_name'
- UUIDs sent as strings to jsonb[] - needs proper array format
- handleSubmit + syncAllMandatoryFees need payload alignment
- Error handling for failed objects missing

**Plan:**

1. **handleSubmit cleanItemData:**
   - Change `name` → `item_name`
   - Ensure branch_ids/department_ids are JSON arrays of strings: `JSON.stringify(formData.branch_ids.map(id => String(id)))`
2. **handleEdit:** Update formData mapping to use `item_name`
3. **Error handling:** Add try-catch around upsert with console.error(failedObject, error)
4. **UUID validation:** Filter non-numeric IDs, log warnings

**Dependent Files:**

- dashboard-electron/src/pages/Expenses.jsx

✅ **Done!**

- Fixed item_name mismatch
- Simplified array handling (strings in jsonb arrays)
- Added console.error for failed upserts with object logging
- handleEdit robust for legacy data
- **Followup:** Test create/edit → check console/network for errors
