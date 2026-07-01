# TODO: Fix Dashboard.jsx dynamic import failure

- [ ] Inspect current `dashboard-electron/src/pages/Dashboard.jsx` for syntax/duplicate declarations.
- [ ] Rewrite `Dashboard.jsx` to remove duplicated `const` blocks and references-before-declaration.
- [ ] Ensure `branches`, `allowedBranches`, `branchOptions`, `selectedBranch`, `branchLabel` are declared exactly once.
- [ ] Keep the existing UI/intent while making the module compile.
- [ ] Restart/refresh Vite and navigate to `/` or `/dashboard` to confirm the dashboard loads.
- [ ] Verify no new console errors.
