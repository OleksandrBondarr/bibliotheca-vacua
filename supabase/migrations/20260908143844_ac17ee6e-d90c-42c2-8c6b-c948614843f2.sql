ALTER TABLE public.books ADD COLUMN IF NOT EXISTS held_for_user_id uuid;
CREATE INDEX IF NOT EXISTS books_held_for_user_idx ON public.books (held_for_user_id);

DROP POLICY IF EXISTS "Books are public" ON public.books;
CREATE POLICY "Books are public unless set aside" ON public.books
  FOR SELECT TO anon, authenticated
  USING (held_for_user_id IS NULL OR held_for_user_id = auth.uid());

CREATE TABLE public.reader_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  department text,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reader_signals TO authenticated;
GRANT ALL ON public.reader_signals TO service_role;
ALTER TABLE public.reader_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Readers add own signals" ON public.reader_signals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Readers see own signals" ON public.reader_signals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS reader_signals_user_idx ON public.reader_signals (user_id, created_at DESC);

CREATE TABLE public.reader_shelf_state (
  user_id uuid PRIMARY KEY,
  generated_at timestamp with time zone,
  signal_count integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reader_shelf_state TO authenticated;
GRANT ALL ON public.reader_shelf_state TO service_role;
ALTER TABLE public.reader_shelf_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Readers manage own shelf state" ON public.reader_shelf_state
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_reader_shelf_state_updated_at
  BEFORE UPDATE ON public.reader_shelf_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();