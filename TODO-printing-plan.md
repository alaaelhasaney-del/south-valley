# Professional Printing System Plan

**Current State Analysis:**

- Print.jsx: Basic student card/financial PDFs with jsPDF (no branch filter)
- Students API supports `?branch_id=ID` filtering
- AuthContext: `user.branch_id`
- Dependencies: react-to-print, jsPDF ✓ (missing lucide-react, framer-motion, html2canvas)
- Students fields: name, photo_data, branch_id, department_id, class_year, national_id, etc.

**Plan:**

## 1. Directory Structure:

```
src/components/
  PrintingTemplates/
    StudentCard.jsx
    Certificate.jsx
    GradeReport.jsx
    EnrollmentProof.jsx
    ApplicationForm.jsx
    ExamSheet.jsx
  PrintPage.jsx (replaces Print.jsx)
```

## 2. Install Dependencies:

```
cd dashboard-electron
npm i lucide-react framer-motion html2canvas @heroicons/react
```

## 3. PrintPage.jsx Features:

**Header Controls:**

- Student select (filtered by `user.branch_id`)
- Document type dropdown (6 types)
- Class/Department multi-filter
- Print/PDF buttons

**Live Preview:** Conditional render templates with framer-motion transitions

**Templates:** Each in separate component with Arabic RTL design, academy logo, dynamic data.

## Dependent Files:

- `dashboard-electron/src/pages/Print.jsx` → rewrite
- New `PrintingTemplates/*` components
- Update `package.json` deps

## Followup Steps:

1. Install deps
2. Create PrintingTemplates dir/files
3. Rewrite Print.jsx
4. Test API calls + print
5. Arabic fonts + branding

**Ready to proceed? Confirm before editing files.**
