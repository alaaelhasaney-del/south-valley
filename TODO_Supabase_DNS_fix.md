# TODO_Supabase_DNS_fix.md

## Goal

Fix `net::ERR_NAME_NOT_RESOLVED` for Supabase REST calls (DNS/URL configuration).

## Steps

1. Add startup logging in `dashboard-electron/src/supabaseClient.js` to print:
   - `VITE_SUPABASE_URL` (redact anon key)
   - `isSupabaseReady`
2. Rebuild/restart dev server/Electron.
3. Verify in console that the URL host is correct and resolves.
4. If still failing, verify env loading / Electron env injection / .env.local placement.
