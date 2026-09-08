ALTER TABLE public.books
  ADD COLUMN featured boolean NOT NULL DEFAULT false,
  ADD COLUMN kept_by_name text,
  ADD COLUMN kept_at timestamp with time zone;

CREATE INDEX books_featured_idx ON public.books (featured) WHERE featured;

CREATE TABLE public.keep_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.keep_requests TO authenticated;
GRANT ALL ON public.keep_requests TO service_role;

ALTER TABLE public.keep_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Readers leave own keep requests"
  ON public.keep_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Readers see own keep requests"
  ON public.keep_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));