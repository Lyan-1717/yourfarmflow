-- Animals: add editable profile fields
ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS photo_path text;

-- Inventory items
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  unit text NOT NULL DEFAULT 'unit',
  quantity_purchased numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  purchase_date date,
  low_stock_threshold numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inventory_items" ON public.inventory_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER inventory_items_set_updated_at BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Inventory usage log
CREATE TABLE IF NOT EXISTS public.inventory_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_used numeric NOT NULL,
  used_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_usage TO authenticated;
GRANT ALL ON public.inventory_usage TO service_role;
ALTER TABLE public.inventory_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inventory_usage" ON public.inventory_usage FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  description text,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents" ON public.documents FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER documents_set_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage RLS: users access only their own folder in animal-photos and project-documents
CREATE POLICY "animal-photos own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'animal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "animal-photos own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'animal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "animal-photos own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'animal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "animal-photos own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'animal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "project-documents own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "project-documents own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "project-documents own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "project-documents own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-documents' AND (storage.foldername(name))[1] = auth.uid()::text);