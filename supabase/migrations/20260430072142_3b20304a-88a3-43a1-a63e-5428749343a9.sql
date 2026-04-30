-- Saved comparisons table
CREATE TABLE public.saved_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  player_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own comparisons"
  ON public.saved_comparisons FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners insert own comparisons"
  ON public.saved_comparisons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners update own comparisons"
  ON public.saved_comparisons FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners delete own comparisons"
  ON public.saved_comparisons FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER update_saved_comparisons_updated_at
  BEFORE UPDATE ON public.saved_comparisons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_saved_comparisons_owner ON public.saved_comparisons(owner_id);