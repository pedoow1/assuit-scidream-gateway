-- Assuit SciDream — full Supabase backend setup
-- Run once in your own Supabase project: Dashboard -> SQL Editor -> New query -> Run.
-- Then create/configure Google OAuth and Vercel env vars from SETUP_GUIDE.md.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'student', 'department_advisor', 'instructor');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'question_type') THEN
    CREATE TYPE public.question_type AS ENUM ('mcq', 'true_false', 'essay');
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  academic_id text UNIQUE,
  phone text,
  id_card_url text,
  is_verified boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'incomplete'
    CHECK (verification_status IN ('incomplete', 'pending', 'verified', 'rejected')),
  rejection_reason text,
  batch_year integer,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  department text NOT NULL,
  year smallint NOT NULL CHECK (year BETWEEN 1 AND 4),
  semester smallint NOT NULL CHECK (semester BETWEEN 1 AND 2),
  credit_hours smallint NOT NULL DEFAULT 3,
  description text,
  cover_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('pdf', 'youtube', 'link')),
  title text NOT NULL,
  description text,
  file_url text,
  youtube_id text,
  external_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  time_limit_min integer,
  pass_score integer NOT NULL DEFAULT 50,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type public.question_type NOT NULL,
  prompt text NOT NULL,
  options jsonb,
  correct_answer text,
  explanation text,
  points integer NOT NULL DEFAULT 1,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score numeric,
  total_points integer,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS folders_subject_idx ON public.folders(subject_id);
CREATE INDEX IF NOT EXISTS folders_parent_idx ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS content_items_folder_idx ON public.content_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id, quiz_id);

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_verification_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') THEN
    IF NEW.verification_status = 'verified' THEN
      NEW.is_verified := true;
    END IF;
    IF NEW.verification_status <> 'verified' THEN
      NEW.is_verified := false;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id = auth.uid() THEN
    IF NEW.verification_status = 'verified' OR NEW.is_verified = true THEN
      RAISE EXCEPTION 'Students cannot verify themselves';
    END IF;
    NEW.is_verified := false;
    IF NEW.verification_status NOT IN ('incomplete', 'pending', 'rejected') THEN
      NEW.verification_status := 'pending';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to update this profile';
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, is_verified, verification_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN lower(NEW.email) = 'abdalahkotp31@gmail.com' THEN true ELSE false END,
    CASE WHEN lower(NEW.email) = 'abdalahkotp31@gmail.com' THEN 'verified' ELSE 'incomplete' END
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    is_verified = CASE WHEN lower(EXCLUDED.email) = 'abdalahkotp31@gmail.com' THEN true ELSE public.profiles.is_verified END,
    verification_status = CASE WHEN lower(EXCLUDED.email) = 'abdalahkotp31@gmail.com' THEN 'verified' ELSE public.profiles.verification_status END,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN lower(NEW.email) = 'abdalahkotp31@gmail.com'
      THEN 'super_admin'::public.app_role
      ELSE 'student'::public.app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS profiles_guard_verification ON public.profiles;
CREATE TRIGGER profiles_guard_verification
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_verification_update();

DROP TRIGGER IF EXISTS subjects_touch_updated_at ON public.subjects;
CREATE TRIGGER subjects_touch_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_quizzes ON public.quizzes;
CREATE TRIGGER touch_quizzes
BEFORE UPDATE ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.user_roles, public.profiles, public.subjects, public.folders, public.content_items, public.quizzes, public.quiz_questions, public.quiz_attempts TO service_role;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_verification_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin manages roles" ON public.user_roles;
CREATE POLICY "Super admin manages roles" ON public.user_roles
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'super_admin'))
WITH CHECK (private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'))
WITH CHECK (auth.uid() = id OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "subjects_select_verified" ON public.subjects;
CREATE POLICY "subjects_select_verified" ON public.subjects
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.verification_status = 'verified')
);

DROP POLICY IF EXISTS "subjects_admin_insert" ON public.subjects;
CREATE POLICY "subjects_admin_insert" ON public.subjects
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "subjects_admin_update" ON public.subjects;
CREATE POLICY "subjects_admin_update" ON public.subjects
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "subjects_admin_delete" ON public.subjects;
CREATE POLICY "subjects_admin_delete" ON public.subjects
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "folders_select_verified" ON public.folders;
CREATE POLICY "folders_select_verified" ON public.folders
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.verification_status = 'verified')
);

DROP POLICY IF EXISTS "folders_admin_all" ON public.folders;
CREATE POLICY "folders_admin_all" ON public.folders
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "content_select_verified" ON public.content_items;
CREATE POLICY "content_select_verified" ON public.content_items
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.verification_status = 'verified')
);

DROP POLICY IF EXISTS "content_admin_all" ON public.content_items;
CREATE POLICY "content_admin_all" ON public.content_items
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Verified students view published quizzes" ON public.quizzes;
CREATE POLICY "Verified students view published quizzes" ON public.quizzes
FOR SELECT TO authenticated
USING (
  ((is_published = true) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.verification_status = 'verified'))
  OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Admins manage quizzes" ON public.quizzes;
CREATE POLICY "Admins manage quizzes" ON public.quizzes
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Verified students view questions of published quizzes" ON public.quiz_questions;
CREATE POLICY "Verified students view questions of published quizzes" ON public.quiz_questions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.quizzes q
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE q.id = quiz_questions.quiz_id
      AND q.is_published = true
      AND p.verification_status = 'verified'
  )
  OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Admins manage questions" ON public.quiz_questions;
CREATE POLICY "Admins manage questions" ON public.quiz_questions
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users manage own attempts" ON public.quiz_attempts;
CREATE POLICY "Users manage own attempts" ON public.quiz_attempts
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all attempts" ON public.quiz_attempts;
CREATE POLICY "Admins view all attempts" ON public.quiz_attempts
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'id-cards',
  'id-cards',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subject-files',
  'subject-files',
  false,
  52428800,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own id-card" ON storage.objects;
CREATE POLICY "Users upload own id-card" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users read own id-card" ON storage.objects;
CREATE POLICY "Users read own id-card" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'id-cards'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'super_admin')
  )
);

DROP POLICY IF EXISTS "Users update own id-card" ON storage.objects;
CREATE POLICY "Users update own id-card" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "subject_files_select_verified" ON storage.objects;
CREATE POLICY "subject_files_select_verified" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'subject-files'
  AND (
    private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.verification_status = 'verified')
  )
);

DROP POLICY IF EXISTS "subject_files_admin_insert" ON storage.objects;
CREATE POLICY "subject_files_admin_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'subject-files' AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "subject_files_admin_update" ON storage.objects;
CREATE POLICY "subject_files_admin_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'subject-files' AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')))
WITH CHECK (bucket_id = 'subject-files' AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "subject_files_admin_delete" ON storage.objects;
CREATE POLICY "subject_files_admin_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'subject-files' AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')));

INSERT INTO public.profiles (id, email, full_name, avatar_url, is_verified, verification_status)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.raw_user_meta_data->>'avatar_url',
  CASE WHEN lower(u.email) = 'abdalahkotp31@gmail.com' THEN true ELSE false END,
  CASE WHEN lower(u.email) = 'abdalahkotp31@gmail.com' THEN 'verified' ELSE 'incomplete' END
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
  avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
  is_verified = CASE WHEN lower(EXCLUDED.email) = 'abdalahkotp31@gmail.com' THEN true ELSE public.profiles.is_verified END,
  verification_status = CASE WHEN lower(EXCLUDED.email) = 'abdalahkotp31@gmail.com' THEN 'verified' ELSE public.profiles.verification_status END,
  updated_at = now();

INSERT INTO public.user_roles (user_id, role)
SELECT
  u.id,
  CASE WHEN lower(u.email) = 'abdalahkotp31@gmail.com'
    THEN 'super_admin'::public.app_role
    ELSE 'student'::public.app_role
  END
FROM auth.users u
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- Industrial Chemistry department module (قسم الكيمياء الصناعية)
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_title text;

ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS instructor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS instructor_name text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS prerequisite_codes text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS is_department_gated boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcements' AND policyname = 'announcements_read_all_auth') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
    GRANT ALL ON public.announcements TO service_role;
    ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "announcements_read_all_auth" ON public.announcements FOR SELECT TO authenticated USING (true);
    CREATE POLICY "announcements_admin_write" ON public.announcements FOR ALL TO authenticated
      USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));
    DROP TRIGGER IF EXISTS announcements_touch ON public.announcements;
    CREATE TRIGGER announcements_touch BEFORE UPDATE ON public.announcements
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS image_url text;

CREATE TABLE IF NOT EXISTS public.department_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department text NOT NULL DEFAULT 'الكيمياء الصناعية',
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  academic_id text,
  academic_year text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS department_applications_user_idx ON public.department_applications(user_id);
CREATE INDEX IF NOT EXISTS department_applications_status_idx ON public.department_applications(status);

CREATE TABLE IF NOT EXISTS public.department_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_advisor'
    CHECK (status IN ('pending_advisor', 'approved', 'needs_receipt', 'paid', 'rejected', 'expired')),
  priority integer NOT NULL DEFAULT 0,
  priority_edit_count integer NOT NULL DEFAULT 0,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id)
);
CREATE INDEX IF NOT EXISTS department_registrations_student_idx ON public.department_registrations(student_id);
CREATE INDEX IF NOT EXISTS department_registrations_subject_idx ON public.department_registrations(subject_id);

DROP TRIGGER IF EXISTS department_registrations_touch ON public.department_registrations;
CREATE TRIGGER department_registrations_touch
BEFORE UPDATE ON public.department_registrations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.guard_priority_edit_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    IF OLD.priority_edit_count >= 3 THEN
      RAISE EXCEPTION 'وصلت للحد الأقصى لعدد مرات تعديل الترتيب (3 مرات)';
    END IF;
    NEW.priority_edit_count := OLD.priority_edit_count + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS department_registrations_priority_guard ON public.department_registrations;
CREATE TRIGGER department_registrations_priority_guard
BEFORE UPDATE ON public.department_registrations
FOR EACH ROW
WHEN (auth.uid() = NEW.student_id)
EXECUTE FUNCTION public.guard_priority_edit_limit();

CREATE TABLE IF NOT EXISTS public.department_payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.department_registrations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'confirmed', 'rejected')),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz
);
CREATE INDEX IF NOT EXISTS department_receipts_registration_idx ON public.department_payment_receipts(registration_id);
CREATE INDEX IF NOT EXISTS department_receipts_student_idx ON public.department_payment_receipts(student_id);

CREATE TABLE IF NOT EXISTS public.department_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  grade text,
  points numeric,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id)
);
DROP TRIGGER IF EXISTS department_grades_touch ON public.department_grades;
CREATE TRIGGER department_grades_touch
BEFORE UPDATE ON public.department_grades
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.is_department_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_applications
    WHERE user_id = _user_id AND status = 'approved'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_department_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_department_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_subject_instructor(_user_id uuid, _subject_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subjects
    WHERE id = _subject_id AND instructor_id = _user_id
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_subject_instructor(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_subject_instructor(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.expire_overdue_department_receipts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  affected_students uuid[];
  affected_count integer;
BEGIN
  IF NOT (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT array_agg(DISTINCT student_id) INTO affected_students
  FROM public.department_registrations r
  WHERE r.status IN ('approved', 'needs_receipt')
    AND r.created_at < now() - interval '7 days'
    AND NOT EXISTS (SELECT 1 FROM public.department_payment_receipts p WHERE p.registration_id = r.id);

  UPDATE public.department_registrations
  SET status = 'expired'
  WHERE status IN ('approved', 'needs_receipt')
    AND created_at < now() - interval '7 days'
    AND NOT EXISTS (SELECT 1 FROM public.department_payment_receipts p WHERE p.registration_id = department_registrations.id);
  GET DIAGNOSTICS affected_count = ROW_COUNT;

  IF affected_students IS NOT NULL THEN
    UPDATE public.department_applications
    SET status = 'rejected', reviewed_at = now()
    WHERE user_id = ANY(affected_students) AND status = 'approved';
  END IF;

  RETURN affected_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.expire_overdue_department_receipts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_overdue_department_receipts() TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.department_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.department_registrations TO authenticated;
GRANT SELECT, INSERT ON public.department_payment_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.department_grades TO authenticated;
GRANT ALL ON public.department_applications, public.department_registrations,
  public.department_payment_receipts, public.department_grades TO service_role;

ALTER TABLE public.department_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dept_apps_select_own_or_staff" ON public.department_applications;
CREATE POLICY "dept_apps_select_own_or_staff" ON public.department_applications
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor'));

DROP POLICY IF EXISTS "dept_apps_insert_own" ON public.department_applications;
CREATE POLICY "dept_apps_insert_own" ON public.department_applications
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "dept_apps_update_staff" ON public.department_applications;
CREATE POLICY "dept_apps_update_staff" ON public.department_applications
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor'))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor'));

DROP POLICY IF EXISTS "dept_regs_select_own_or_staff" ON public.department_registrations;
CREATE POLICY "dept_regs_select_own_or_staff" ON public.department_registrations
FOR SELECT TO authenticated
USING (
  auth.uid() = student_id
  OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor')
  OR public.is_subject_instructor(auth.uid(), subject_id)
);

DROP POLICY IF EXISTS "dept_regs_insert_own" ON public.department_registrations;
CREATE POLICY "dept_regs_insert_own" ON public.department_registrations
FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id AND public.is_department_member(auth.uid()));

DROP POLICY IF EXISTS "dept_regs_update_own_or_staff" ON public.department_registrations;
CREATE POLICY "dept_regs_update_own_or_staff" ON public.department_registrations
FOR UPDATE TO authenticated
USING (auth.uid() = student_id OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor'))
WITH CHECK (auth.uid() = student_id OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor'));

DROP POLICY IF EXISTS "dept_receipts_select_own_or_staff" ON public.department_payment_receipts;
CREATE POLICY "dept_receipts_select_own_or_staff" ON public.department_payment_receipts
FOR SELECT TO authenticated
USING (auth.uid() = student_id OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor'));

DROP POLICY IF EXISTS "dept_receipts_insert_own" ON public.department_payment_receipts;
CREATE POLICY "dept_receipts_insert_own" ON public.department_payment_receipts
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND EXISTS (SELECT 1 FROM public.department_registrations r WHERE r.id = registration_id AND r.student_id = auth.uid())
);

DROP POLICY IF EXISTS "dept_receipts_update_staff" ON public.department_payment_receipts;
CREATE POLICY "dept_receipts_update_staff" ON public.department_payment_receipts
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor'))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor'));

DROP POLICY IF EXISTS "dept_grades_select_own_or_staff" ON public.department_grades;
CREATE POLICY "dept_grades_select_own_or_staff" ON public.department_grades
FOR SELECT TO authenticated
USING (
  auth.uid() = student_id
  OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor')
  OR public.is_subject_instructor(auth.uid(), subject_id)
);

DROP POLICY IF EXISTS "dept_grades_write_instructor" ON public.department_grades;
CREATE POLICY "dept_grades_write_instructor" ON public.department_grades
FOR ALL TO authenticated
USING (public.is_subject_instructor(auth.uid(), subject_id) OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.is_subject_instructor(auth.uid(), subject_id) OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('department-receipts', 'department-receipts', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "dept_receipts_upload_own" ON storage.objects;
CREATE POLICY "dept_receipts_upload_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'department-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "dept_receipts_read_own_or_staff" ON storage.objects;
CREATE POLICY "dept_receipts_read_own_or_staff" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'department-receipts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin') OR private.has_role(auth.uid(), 'department_advisor')
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('announcement-images', 'announcement-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "announcement_images_public_read" ON storage.objects;
CREATE POLICY "announcement_images_public_read" ON storage.objects
FOR SELECT TO authenticated, anon USING (bucket_id = 'announcement-images');

DROP POLICY IF EXISTS "announcement_images_admin_write" ON storage.objects;
CREATE POLICY "announcement_images_admin_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'announcement-images' AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "announcement_images_admin_update" ON storage.objects;
CREATE POLICY "announcement_images_admin_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'announcement-images' AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "announcement_images_admin_delete" ON storage.objects;
CREATE POLICY "announcement_images_admin_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'announcement-images' AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'super_admin')));

COMMIT;
