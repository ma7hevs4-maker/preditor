
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  polo TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('melhoria', 'falha_sistemica', 'falha_operacional', 'informacao')),
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback" ON public.user_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read feedback" ON public.user_feedback FOR SELECT USING (true);
