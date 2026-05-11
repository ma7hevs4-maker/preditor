CREATE OR REPLACE FUNCTION public.clear_saved_dashboard_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE
    public.saved_inc_rows,
    public.saved_m300_rows,
    public.saved_upload_meta,
    public.saved_processed_cache
  RESTART IDENTITY;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_saved_dashboard_data() TO anon, authenticated;