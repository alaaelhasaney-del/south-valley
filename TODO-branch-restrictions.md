# Branch Student Restrictions (فرعي فقط)

**Goal**: Non-admin → their branch students ONLY

**Plan**:

```
1. server.js → restrictToBranch middleware ALL student APIs ✅
2. Frontend dropdowns → auto-filter user.branch_id ✅
3. NO 403 errors → Graceful handling ✅
```

**Status**: Implementing...
