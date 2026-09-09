CREATE TABLE public.chronicle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('card_issued','taken_out','returned','kept_forever','given')),
  reader_name text NOT NULL DEFAULT 'A reader',
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  book_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chronicle_events TO anon;
GRANT SELECT ON public.chronicle_events TO authenticated;
GRANT ALL ON public.chronicle_events TO service_role;

ALTER TABLE public.chronicle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "The chronicle is public" ON public.chronicle_events
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX chronicle_events_created_at_idx ON public.chronicle_events (created_at DESC);
CREATE INDEX chronicle_events_reader_idx ON public.chronicle_events (lower(reader_name));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chronicle_opt_out boolean NOT NULL DEFAULT false;