-- Defence in depth: table privileges now match the policies, so anonymous
-- visitors cannot reach reader-identifying tables even if a policy changes.

REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.loans FROM anon;
REVOKE ALL ON public.keep_requests FROM anon;
REVOKE ALL ON public.reader_signals FROM anon;
REVOKE ALL ON public.reader_shelf_state FROM anon;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.auth_attempts FROM anon;
REVOKE ALL ON public.auth_attempts FROM authenticated;

-- Public reading surfaces: read only for anonymous visitors.
REVOKE ALL ON public.books FROM anon;
REVOKE ALL ON public.publishers FROM anon;
REVOKE ALL ON public.chronicle_events FROM anon;
GRANT SELECT ON public.books TO anon;
GRANT SELECT ON public.publishers TO anon;
GRANT SELECT ON public.chronicle_events TO anon;

-- The Chronicle is written only by the library itself.
REVOKE INSERT, UPDATE, DELETE ON public.chronicle_events FROM authenticated;
GRANT SELECT ON public.chronicle_events TO authenticated;

-- Readers may not insert or delete their own card row or roles directly.
REVOKE INSERT, DELETE ON public.profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.loans TO service_role;
GRANT ALL ON public.keep_requests TO service_role;
GRANT ALL ON public.reader_signals TO service_role;
GRANT ALL ON public.reader_shelf_state TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.auth_attempts TO service_role;
GRANT ALL ON public.books TO service_role;
GRANT ALL ON public.publishers TO service_role;
GRANT ALL ON public.chronicle_events TO service_role;