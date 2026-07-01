# TODO: ميزة طباعة إيصال الدفع (مرة واحدة)

## الخطة:

### 1. Database (تم)

- [x] add-receipt-print-fields.sql → is_printed, printed_by

### 2. Frontend Updates

- [ ] StudentFeesPayment.jsx
  - إضافة useReactToPrint + ReceiptTemplate
  - handlePrintReceipt(feeId) → RPC call → print → update DB
  - Admin: دائماً متاح | غير Admin: مرة واحدة فقط
  - زر disabled if is_printed && !admin

### 3. Receipt Template

- [ ] create PrintingTemplates/Receipt.jsx (Thermal 80mm)
  - لوجو + رقم + طالب + مبلغ + غرض + تاريخ + موظف
  - @media print { margin: 0; width: 80mm }

### 4. Permissions

- [ ] PermissionsContext: 'receipt_print' permission

### 5. Test

- [ ] Admin: print anytime ✓
- [ ] User: print once → disabled ✓
- [ ] Thermal printer layout ✓

**الخطوة التالية:** StudentFeesPayment.jsx + Receipt.jsx

**حالة:** Database جاهز - Frontend قيد التنفيذ
