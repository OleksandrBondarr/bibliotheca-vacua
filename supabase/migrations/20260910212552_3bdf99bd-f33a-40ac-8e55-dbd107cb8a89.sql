ALTER TABLE public.books
  ADD COLUMN narrative boolean NOT NULL DEFAULT false,
  ADD COLUMN reviewer_name text;

COMMENT ON COLUMN public.books.narrative IS 'Uses scene-led popular-fiction prose in page generation.';
COMMENT ON COLUMN public.books.reviewer_name IS 'Invented named critic shown on selected catalogue cards.';