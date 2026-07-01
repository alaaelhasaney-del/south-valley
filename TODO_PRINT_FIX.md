# TODO_PRINT_FIX.md

- [ ] Locate syntax corruption around GraduateGradeReport -> getTermGrades in dashboard-electron/src/pages/Print.jsx.
- [ ] Remove duplicated/garbled blocks inside getTermGrades (extra braces / unreachable code) that break compilation (TS1128).
- [ ] Ensure GraduateGradeReport returns valid JSX and component closes properly.
- [ ] Run typecheck/build (npm test/build) to confirm no more TS syntax errors.
