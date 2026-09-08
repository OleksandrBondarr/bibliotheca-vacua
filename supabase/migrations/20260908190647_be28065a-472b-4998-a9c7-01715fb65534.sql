CREATE TABLE public.auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_attempts_email_idx ON public.auth_attempts (email, created_at DESC);
CREATE INDEX auth_attempts_ip_idx ON public.auth_attempts (ip, created_at DESC);
GRANT ALL ON public.auth_attempts TO service_role;
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.auth_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.note_keep_name(_book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  SELECT display_name INTO _name FROM public.profiles WHERE user_id = auth.uid();
  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RETURN;
  END IF;
  UPDATE public.books SET kept_by_name = _name WHERE id = _book_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.note_keep_name(uuid) TO authenticated;