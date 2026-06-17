
-- =========================================================
-- ANIMALS (individual)
-- =========================================================
CREATE TABLE public.animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.livestock(id) ON DELETE CASCADE,
  mother_id uuid REFERENCES public.animals(id) ON DELETE SET NULL,
  name text,
  tag_number text,
  animal_type text NOT NULL,
  breed text,
  gender text,
  date_of_birth date,
  status text NOT NULL DEFAULT 'Healthy',
  estimated_value numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.animals TO authenticated;
GRANT ALL ON public.animals TO service_role;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
CREATE POLICY animals_own ON public.animals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER animals_updated BEFORE UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_animals_group ON public.animals(group_id);
CREATE INDEX idx_animals_mother ON public.animals(mother_id);

-- =========================================================
-- ANIMAL STATUS HISTORY
-- =========================================================
CREATE TABLE public.animal_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  animal_id uuid NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.animal_status_history TO authenticated;
GRANT ALL ON public.animal_status_history TO service_role;
ALTER TABLE public.animal_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY ash_own ON public.animal_status_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- ANIMAL HEALTH RECORDS
-- =========================================================
CREATE TABLE public.animal_health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  animal_id uuid NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  record_type text NOT NULL, -- vaccination | deworming | treatment | checkup
  description text,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  cost numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.animal_health_records TO authenticated;
GRANT ALL ON public.animal_health_records TO service_role;
ALTER TABLE public.animal_health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY ahr_own ON public.animal_health_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- BREEDING RECORDS
-- =========================================================
CREATE TABLE public.breeding_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  animal_id uuid NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  mate_tag text,
  bred_on date NOT NULL DEFAULT CURRENT_DATE,
  expected_due date,
  outcome text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.breeding_records TO authenticated;
GRANT ALL ON public.breeding_records TO service_role;
ALTER TABLE public.breeding_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY br_own ON public.breeding_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- BIRTH RECORDS (creates offspring via function)
-- =========================================================
CREATE TABLE public.birth_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.livestock(id) ON DELETE CASCADE,
  mother_id uuid REFERENCES public.animals(id) ON DELETE SET NULL,
  birth_date date NOT NULL DEFAULT CURRENT_DATE,
  num_offspring integer NOT NULL DEFAULT 1,
  num_males integer NOT NULL DEFAULT 0,
  num_females integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.birth_records TO authenticated;
GRANT ALL ON public.birth_records TO service_role;
ALTER TABLE public.birth_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY birth_own ON public.birth_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Function to record a birth & create offspring atomically
CREATE OR REPLACE FUNCTION public.record_birth(
  _project_id uuid,
  _group_id uuid,
  _mother_id uuid,
  _birth_date date,
  _num_males integer,
  _num_females integer,
  _notes text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _atype text;
  _birth_id uuid;
  _total integer := COALESCE(_num_males,0) + COALESCE(_num_females,0);
  i integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _total <= 0 THEN RAISE EXCEPTION 'Number of offspring must be > 0'; END IF;
  -- Verify ownership of the group
  SELECT animal_type INTO _atype FROM public.livestock WHERE id = _group_id AND user_id = _uid;
  IF _atype IS NULL THEN RAISE EXCEPTION 'Group not found'; END IF;

  INSERT INTO public.birth_records (user_id, project_id, group_id, mother_id, birth_date, num_offspring, num_males, num_females, notes)
  VALUES (_uid, _project_id, _group_id, _mother_id, _birth_date, _total, COALESCE(_num_males,0), COALESCE(_num_females,0), _notes)
  RETURNING id INTO _birth_id;

  -- Create male offspring
  FOR i IN 1..COALESCE(_num_males,0) LOOP
    INSERT INTO public.animals (user_id, project_id, group_id, mother_id, animal_type, gender, date_of_birth, status, estimated_value)
    VALUES (_uid, _project_id, _group_id, _mother_id, _atype, 'Male', _birth_date, 'Growing', 0);
  END LOOP;
  FOR i IN 1..COALESCE(_num_females,0) LOOP
    INSERT INTO public.animals (user_id, project_id, group_id, mother_id, animal_type, gender, date_of_birth, status, estimated_value)
    VALUES (_uid, _project_id, _group_id, _mother_id, _atype, 'Female', _birth_date, 'Growing', 0);
  END LOOP;

  -- Update herd quantity
  UPDATE public.livestock SET quantity = COALESCE(quantity,0) + _total, updated_at = now()
   WHERE id = _group_id AND user_id = _uid;

  -- Update mother status if provided
  IF _mother_id IS NOT NULL THEN
    UPDATE public.animals SET status = 'Nursing', updated_at = now()
     WHERE id = _mother_id AND user_id = _uid;
    INSERT INTO public.animal_status_history (user_id, animal_id, status, changed_at, notes)
    VALUES (_uid, _mother_id, 'Nursing', _birth_date, 'Gave birth to ' || _total || ' offspring');
  END IF;

  RETURN _birth_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_birth(uuid, uuid, uuid, date, integer, integer, text) TO authenticated;

-- =========================================================
-- MILK RECORDS
-- =========================================================
CREATE TABLE public.milk_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.livestock(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES public.animals(id) ON DELETE SET NULL,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  liters numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milk_records TO authenticated;
GRANT ALL ON public.milk_records TO service_role;
ALTER TABLE public.milk_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY milk_own ON public.milk_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_milk_group_date ON public.milk_records(group_id, record_date);

-- =========================================================
-- LIVESTOCK VALUATION SNAPSHOTS
-- =========================================================
CREATE TABLE public.livestock_valuation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  group_id uuid REFERENCES public.livestock(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  total_value numeric NOT NULL DEFAULT 0,
  animal_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.livestock_valuation_snapshots TO authenticated;
GRANT ALL ON public.livestock_valuation_snapshots TO service_role;
ALTER TABLE public.livestock_valuation_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY lvs_own ON public.livestock_valuation_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- CONSTRUCTION ACTIVITIES
-- =========================================================
CREATE TABLE public.construction_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'Planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.construction_activities TO authenticated;
GRANT ALL ON public.construction_activities TO service_role;
ALTER TABLE public.construction_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY ca_own ON public.construction_activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ca_updated BEFORE UPDATE ON public.construction_activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- ADDITIVE COLUMNS
-- =========================================================
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS activity_id uuid,
  ADD COLUMN IF NOT EXISTS construction_activity_id uuid,
  ADD COLUMN IF NOT EXISTS expense_type text;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;
