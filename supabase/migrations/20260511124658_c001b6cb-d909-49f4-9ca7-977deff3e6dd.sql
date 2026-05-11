CREATE OR REPLACE FUNCTION public.clear_saved_dashboard_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.saved_inc_rows RESTART IDENTITY;
  TRUNCATE TABLE public.saved_m300_rows RESTART IDENTITY;
  DELETE FROM public.saved_upload_meta;
  DELETE FROM public.saved_processed_cache;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_saved_dashboard_data() TO anon, authenticated;