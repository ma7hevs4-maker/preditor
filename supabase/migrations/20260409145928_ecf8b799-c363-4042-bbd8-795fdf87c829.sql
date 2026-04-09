
-- Add row_hash column to saved_inc_rows for upsert deduplication
ALTER TABLE public.saved_inc_rows ADD COLUMN row_hash TEXT;
CREATE UNIQUE INDEX idx_saved_inc_rows_hash ON public.saved_inc_rows (row_hash);

-- Add row_hash column to saved_m300_rows for upsert deduplication
ALTER TABLE public.saved_m300_rows ADD COLUMN row_hash TEXT;
CREATE UNIQUE INDEX idx_saved_m300_rows_hash ON public.saved_m300_rows (row_hash);

-- Add UPDATE RLS policies (needed for upsert ON CONFLICT DO UPDATE)
CREATE POLICY "Inc pode ser atualizada"
ON public.saved_inc_rows
FOR UPDATE
TO public
USING (true);

CREATE POLICY "M300 pode ser atualizada"
ON public.saved_m300_rows
FOR UPDATE
TO public
USING (true);

-- Create processed cache table for fast loading
CREATE TABLE public.saved_processed_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processed_data JSONB NOT NULL,
  inc_file_name TEXT,
  m300_file_name TEXT,
  row_count_inc INTEGER NOT NULL DEFAULT 0,
  row_count_m300 INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_processed_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache visível publicamente"
ON public.saved_processed_cache FOR SELECT
TO public USING (true);

CREATE POLICY "Cache pode ser inserido"
ON public.saved_processed_cache FOR INSERT
TO public WITH CHECK (true);

CREATE POLICY "Cache pode ser atualizado"
ON public.saved_processed_cache FOR UPDATE
TO public USING (true);

CREATE POLICY "Cache pode ser deletado"
ON public.saved_processed_cache FOR DELETE
TO public USING (true);

-- Also add UPDATE policy to saved_upload_meta (needed for future use)
CREATE POLICY "Meta pode ser atualizada"
ON public.saved_upload_meta FOR UPDATE
TO public USING (true);
