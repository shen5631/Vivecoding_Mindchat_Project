
DROP POLICY IF EXISTS "anon can read sessions" ON public.sessions;
DROP POLICY IF EXISTS "anon can insert sessions" ON public.sessions;
DROP POLICY IF EXISTS "anon can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "anon can read messages" ON public.messages;
DROP POLICY IF EXISTS "anon can insert messages" ON public.messages;

REVOKE ALL ON public.sessions FROM anon, authenticated;
REVOKE ALL ON public.messages FROM anon, authenticated;
-- service_role bypasses RLS; all access goes through server functions.
