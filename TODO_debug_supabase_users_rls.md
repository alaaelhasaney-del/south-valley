# TODO: Fix Supabase 406 on `public.users` (AuthContext profile fetch)

## Problem

Frontend calls:
`supabase.from('users').select('*').eq('id', user.id).single()`
and Supabase REST returns `406 (Not Acceptable)`.

This prevents:

- `AuthContext` from loading profile
- `PermissionsContext` from loading `role_permissions`
- Sidebar from rendering menu items

## Confirmed schema

`public.users.id uuid not null default gen_random_uuid()`

⚠️ This means `public.users.id` is **NOT inherently** `auth.uid()`; your app must ensure it is set to Auth user id when creating users.

## Step plan

1. Check how `public.users.id` is populated during user creation.
   - Find where `insert into users` happens (Supabase admin createUser flow).
2. If it’s supposed to match Auth UID:
   - Update insertion so `id = authData.user.id`.
   - Your `api/adminUsers.js` already does this for admin creation.
   - Verify it’s used by the actual user creation flow (Register flow).
3. Add/repair RLS policies on `public.users`:
   - Allow authenticated users to `select` their own profile row based on your mapping.
   - Since schema shows id is random by default, best policy is by `email`.
   - Example policy approach: `using (email = auth.jwt()->>'email')`.
4. Retry login and confirm:
   - 406 disappears
   - role loads
   - Sidebar items render

## Candidate RLS policies to implement (pick one based on mapping)

A) If `public.users.id` equals Auth UID (preferred mapping):

- `USING (id = auth.uid())`

B) If mapping is by email (since id defaults random):

- `USING (email = auth.jwt()->>'email')`

## Next required investigation

- Locate frontend/backend Register flow and where `public.users` row is inserted.
- Ensure mapping consistency between Auth user and `public.users` row.
