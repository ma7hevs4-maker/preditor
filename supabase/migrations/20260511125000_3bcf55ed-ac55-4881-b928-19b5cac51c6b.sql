CREATE OR REPLACE FUNCTION public.clear_saved_dashboard_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.saved_inc_rows WHERE id IS NOT NULL OR id IS NULL;
  DELETE FROM public.saved_m300_rows WHERE id IS NOT NULL OR id IS NULL;
  DELETE FROM public.saved_upload_meta WHERE id IS NOT NULL OR id IS NULL;
  DELETE FROM public.saved_processed_cache WHERE id IS NOT NULL OR id IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_saved_dashboard_data() TO anon, authenticated;