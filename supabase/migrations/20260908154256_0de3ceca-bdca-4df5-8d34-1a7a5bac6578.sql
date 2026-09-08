ALTER TABLE public.books ALTER COLUMN shelf_mark SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.assign_book_shelf_mark()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  prefix text;
  next_sequence integer;
BEGIN
  IF NEW.shelf_mark IS NOT NULL AND NEW.shelf_mark <> '' THEN
    RETURN NEW;
  END IF;

  prefix := CASE NEW.department::text
    WHEN 'novels' THEN 'N'
    WHEN 'poetry' THEN 'P'
    WHEN 'treatises' THEN 'T'
    WHEN 'sciences' THEN 'S'
    WHEN 'memoirs' THEN 'M'
    WHEN 'reference' THEN 'R'
    WHEN 'restricted' THEN 'X'
  END;

  PERFORM pg_advisory_xact_lock(hashtext('book-shelf-mark-' || prefix));

  SELECT COALESCE(MAX(substring(shelf_mark FROM 2)::integer), 0) + 1
  INTO next_sequence
  FROM public.books
  WHERE shelf_mark LIKE prefix || '%';

  NEW.shelf_mark := prefix || lpad(next_sequence::text, 3, '0');
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_book_shelf_mark() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_book_shelf_mark() FROM anon;
REVOKE ALL ON FUNCTION public.assign_book_shelf_mark() FROM authenticated;