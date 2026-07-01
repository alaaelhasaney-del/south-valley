# TODO: Add Grade Table Columns (course / max / min / student grade / تقدير)

- [ ] Update `dashboard-electron/src/pages/StudentGrades.jsx` UI table to show columns:
  - المقرر
  - النهاية العظمى
  - النهاية الصغرى
  - درجة الطالب
  - التقدير
- [ ] Compute per-row:
  - النهاية العظمى = 100
  - النهاية الصغرى = 50
  - اتقدير from grade.grade using thresholds (>=90 ممتاز، >=75 جيد جداً، >=60 جيد، else راسب)
- [ ] Ensure student grade remains editable (still input for grade and comment).
- [ ] Update `dashboard-electron/src/components/PrintingTemplates/Certificate.jsx` table header/rows to match the same columns.
- [ ] Update print honor/average if needed (keep existing average honors).
- [ ] Smoke test: open StudentGrades page and verify rendering + print.
