
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  department TEXT NOT NULL,
  year SMALLINT NOT NULL CHECK (year BETWEEN 1 AND 4),
  semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 2),
  credit_hours SMALLINT DEFAULT 3,
  description TEXT,
  cover_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_select_verified" ON public.subjects FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.verification_status='verified')
  );
CREATE POLICY "subjects_admin_insert" ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "subjects_admin_update" ON public.subjects FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "subjects_admin_delete" ON public.subjects FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX folders_subject_idx ON public.folders(subject_id);
CREATE INDEX folders_parent_idx ON public.folders(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT ALL ON public.folders TO service_role;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "folders_select_verified" ON public.folders FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.verification_status='verified')
  );
CREATE POLICY "folders_admin_all" ON public.folders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pdf','youtube','link')),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  youtube_id TEXT,
  external_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX content_items_folder_idx ON public.content_items(folder_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_select_verified" ON public.content_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.verification_status='verified')
  );
CREATE POLICY "content_admin_all" ON public.content_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "subject_files_select_verified" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'subject-files' AND (
      public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.verification_status='verified')
    )
  );
CREATE POLICY "subject_files_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='subject-files' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));
CREATE POLICY "subject_files_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='subject-files' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));
CREATE POLICY "subject_files_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='subject-files' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER subjects_touch_updated_at BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
