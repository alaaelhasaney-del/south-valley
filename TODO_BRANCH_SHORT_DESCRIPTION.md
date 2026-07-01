# TODO - Branch Short Description

- [x] Add `short_description` column to `branches` table (via new migration file)

- [x] Update UI in `dashboard-electron/src/pages/Branches.jsx`:
  - [x] Add input field in add/edit modal
  - [x] Populate field on edit
  - [x] Reset field on modal close
  - [x] Show short description in branches list

- [x] Ensure data is saved (payload includes `short_description` automatically)

- [ ] Test add/edit branch flow
