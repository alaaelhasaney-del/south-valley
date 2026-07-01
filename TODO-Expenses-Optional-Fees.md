# Expenses Optional Fees Enhancement

**Status:** Plan ready for implementation

**Current:**

- Mandatory: auto-sync ✓
- Optional: no manual assignment

**User Request:**

1. After student selection in StudentFeesPayment
2. Button "إضافة رسوم اختيارية"
3. Modal shows expense_items (is_mandatory=false)
4. Select expense → **use expense.amount** (no custom amount)
5. Create student_fees record → refresh list

**Implementation Steps:**

- [ ] Add button after student info grid
- [ ] Modal state + expense_items fetch
- [ ] Select + create student_fees insert
- [ ] Refresh fees/balance

**Next:** Create StudentFeesPayment.jsx implementation
