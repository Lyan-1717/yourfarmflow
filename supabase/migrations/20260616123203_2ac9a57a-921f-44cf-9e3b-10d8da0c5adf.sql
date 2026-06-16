CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'farm',
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_own ON public.projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.expenses ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.income ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.activities ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.crops ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX idx_expenses_project ON public.expenses(project_id);
CREATE INDEX idx_income_project ON public.income(project_id);
CREATE INDEX idx_activities_project ON public.activities(project_id);
CREATE INDEX idx_crops_project ON public.crops(project_id);