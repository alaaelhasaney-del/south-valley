-- Fix: block any INSERT/UPDATE on public.users from non-service-role clients
-- because FK public.users(id) REFERENCES auth.users(id)

-- 1) Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2) Remove permissive write policies if they exist (safe to run)
DO $$
BEGIN
  -- delete any policy that can write to users by default
  FOR rec IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  ) LOOP
    -- keep only read policies if needed; for now remove all to be explicit
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', rec.policyname, rec.schemaname, rec.tablename);
  END LOOP;
END $$;

-- 3) Add READ policies (minimal, based on your current ones)
CREATE POLICY "users_read_own" ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 4) Add explicit DENY for INSERT/UPDATE/DELETE for authenticated/public
-- Postgres doesn't have explicit DENY policies, so we create no-allow policies by omitting them.
-- With RLS enabled and no INSERT/UPDATE policies, these operations are blocked.

-- 5) Add an ALLOW policy that works only for the API/server via service role:
-- Service role bypasses RLS automatically in Supabase, so you typically don't need an allow policy.
-- But if you're using a custom Postgres role that is still subject to RLS, create an allow policy.
-- Uncomment and set correct role if you use a dedicated DB role.
--
-- CREATE POLICY "users_write_service_role" ON public.users
-- FOR INSERT
-- TO service_role
-- WITH CHECK (id = auth.uid());

