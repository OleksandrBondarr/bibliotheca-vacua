ALTER TABLE public.books ADD COLUMN shelf_mark text;

WITH numbered AS (
  SELECT
    id,
    CASE department::text
      WHEN 'novels' THEN 'N'
      WHEN 'poetry' THEN 'P'
      WHEN 'treatises' THEN 'T'
      WHEN 'sciences' THEN 'S'
      WHEN 'memoirs' THEN 'M'
      WHEN 'reference' THEN 'R'
      WHEN 'restricted' THEN 'X'
    END AS prefix,
    row_number() OVER (PARTITION BY department ORDER BY created_at, id) AS sequence
  FROM public.books
)
UPDATE public.books AS b
SET shelf_mark = numbered.prefix || lpad(numbered.sequence::text, 3, '0')
FROM numbered
WHERE b.id = numbered.id;

ALTER TABLE public.books ALTER COLUMN shelf_mark SET NOT NULL;
ALTER TABLE public.books ADD CONSTRAINT books_shelf_mark_unique UNIQUE (shelf_mark);
ALTER TABLE public.books ADD CONSTRAINT books_shelf_mark_format CHECK (shelf_mark ~ '^[NPTSMRX][0-9]{3,}$');

CREATE OR REPLACE FUNCTION public.assign_book_shelf_mark()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  next_sequence integer;
BEGIN
  IF NEW.shelf_mark IS NOT NULL THEN
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

CREATE TRIGGER assign_book_shelf_mark_before_insert
BEFORE INSERT ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.assign_book_shelf_mark();