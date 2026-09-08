ALTER TABLE public.books RENAME COLUMN held_for_user_id TO private_for;

DROP POLICY IF EXISTS "Books are public unless set aside" ON public.books;
CREATE POLICY "Books are public unless set aside" ON public.books
  FOR SELECT TO anon, authenticated
  USING (private_for IS NULL OR private_for = auth.uid());