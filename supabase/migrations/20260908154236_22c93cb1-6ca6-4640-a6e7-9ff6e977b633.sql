ALTER FUNCTION public.assign_book_shelf_mark() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.assign_book_shelf_mark() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_book_shelf_mark() FROM anon;
REVOKE ALL ON FUNCTION public.assign_book_shelf_mark() FROM authenticated;