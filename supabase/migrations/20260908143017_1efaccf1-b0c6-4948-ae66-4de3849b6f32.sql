ALTER TABLE public.books ADD COLUMN IF NOT EXISTS shelf text;

UPDATE public.books SET shelf = 'impossible' WHERE department = 'sciences' AND shelf IS NULL;

CREATE INDEX IF NOT EXISTS books_department_shelf_idx ON public.books (department, shelf);