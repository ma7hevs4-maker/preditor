
-- Drop old table
DROP TABLE IF EXISTS public.saved_dashboard_data;

-- Metadata table for saved uploads
CREATE TABLE public.saved_upload_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inc_file_name text,
  m300_file_name text,
  row_count_inc integer NOT NULL DEFAULT 0,
  row_count_m300 integer NOT NULL DEFAULT 0,
  saved_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_upload_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meta visível publicamente" ON public.saved_upload_meta FOR SELECT TO public USING (true);
CREATE POLICY "Meta pode ser inserida" ON public.saved_upload_meta FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Meta pode ser deletada" ON public.saved_upload_meta FOR DELETE TO public USING (true);

-- Raw incident rows
CREATE TABLE public.saved_inc_rows (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  row_data jsonb NOT NULL
);

ALTER TABLE public.saved_inc_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inc visível publicamente" ON public.saved_inc_rows FOR SELECT TO public USING (true);
CREATE POLICY "Inc pode ser inserida" ON public.saved_inc_rows FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Inc pode ser deletada" ON public.saved_inc_rows FOR DELETE TO public USING (true);

-- Raw M300 rows
CREATE TABLE public.saved_m300_rows (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  row_data jsonb NOT NULL
);

ALTER TABLE public.saved_m300_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "M300 visível publicamente" ON public.saved_m300_rows FOR SELECT TO public USING (true);
CREATE POLICY "M300 pode ser inserida" ON public.saved_m300_rows FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "M300 pode ser deletada" ON public.saved_m300_rows FOR DELETE TO public USING (true);
