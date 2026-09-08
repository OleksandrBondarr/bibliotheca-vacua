CREATE OR REPLACE FUNCTION public.handle_new_reader()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, card_number)
  VALUES (
    NEW.id,
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'display_name', '')), ''),
    'BV-' || lpad(nextval('public.card_number_seq')::text, 5, '0')
  );
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_reader() FROM anon, authenticated, public;