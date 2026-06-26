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
SELECT u.id, CASE WHEN lower(u.email) = 'abdalahkotp31@gmail.com' THEN 'super_admin'::public.app_role ELSE 'student'::public.app_role END
FROM auth.users u
ON CONFLICT (user_id, role) DO NOTHING;