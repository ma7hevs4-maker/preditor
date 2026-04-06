
CREATE TABLE public.saved_dashboard_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data jsonb NOT NULL,
  source_files jsonb DEFAULT NULL,
  saved_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_dashboard_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dados salvos são visíveis publicamente" ON public.saved_dashboard_data FOR SELECT TO public USING (true);
CREATE POLICY "Dados salvos podem ser inseridos" ON public.saved_dashboard_data FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Dados salvos podem ser atualizados" ON public.saved_dashboard_data FOR UPDATE TO public USING (true);
CREATE POLICY "Dados salvos podem ser deletados" ON public.saved_dashboard_data FOR DELETE TO public USING (true);
