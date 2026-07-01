# Fix Student Add 500 Error - Missing tenant_id

## Steps:

### 1. [✅] Update server.js

- Add tenant_id to TABLE_SCHEMAS.students whitelist
- Auto-set tenant_id = 1 in POST/PUT /students
- Add logging for tenant validation

### 2. [ ] Update schema.sql

- INSERT default tenant if missing

### 3. [ ] Optimize Students.jsx

- Photo compression (<1MB)
- Better error display

### 4. [ ] Test

- Restart server.js
- Add student in UI
- Verify success + auto-fees assignment

### 5. [ ] Complete TODO + cleanup

**Status**: Starting implementation...
