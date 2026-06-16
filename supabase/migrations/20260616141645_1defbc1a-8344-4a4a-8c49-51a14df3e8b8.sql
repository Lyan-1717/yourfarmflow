
-- Livestock groups
CREATE TABLE public.livestock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  animal_type text NOT NULL,
  breed text,
  quantity integer NOT NULL DEFAULT 0,
  purchase_date date,
  purchase_cost numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.livestock TO authenticated;
GRANT ALL ON public.livestock TO service_role;
ALTER TABLE public.livestock ENABLE ROW LEVEL SECURITY;
CREATE POLICY livestock_own ON public.livestock FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER livestock_set_updated_at BEFORE UPDATE ON public.livestock FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Livestock activities
CREATE TABLE public.livestock_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  livestock_id uuid REFERENCES public.livestock(id) ON DELETE SET NULL,
  type text NOT NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.livestock_activities TO authenticated;
GRANT ALL ON public.livestock_activities TO service_role;
ALTER TABLE public.livestock_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY livestock_activities_own ON public.livestock_activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
