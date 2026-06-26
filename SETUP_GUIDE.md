# Assuit SciDream — Supabase + Vercel setup

## 1) Supabase backend on YOUR project

1. Create a new Supabase project.
2. Open **SQL Editor**.
3. Copy and run the full script in:

```txt
supabase/ASSUIT_SCIDREAM_FULL_SETUP.sql
```

This creates all tables, RLS policies, triggers, roles, and private buckets:

- `profiles`
- `user_roles`
- `subjects`
- `folders`
- `content_items`
- `quizzes`
- `quiz_questions`
- `quiz_attempts`
- Storage buckets: `id-cards`, `subject-files`

The super admin email is already set to:

```txt
abdalahkotp31@gmail.com
```

## 2) Supabase Google OAuth

In Supabase Dashboard:

1. Go to **Authentication -> Providers -> Google**.
2. Enable Google.
3. Add Google Client ID and Client Secret from Google Cloud.
4. In Google Cloud OAuth app, add this authorized redirect URI:

```txt
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

5. In Supabase **Authentication -> URL Configuration** set:

**Site URL**

```txt
https://YOUR_VERCEL_DOMAIN.vercel.app
```

**Redirect URLs**

```txt
http://localhost:5173/**
http://localhost:3000/**
https://YOUR_VERCEL_DOMAIN.vercel.app/**
https://YOUR_CUSTOM_DOMAIN/**
```

## 3) Local `.env`

Create `.env` from `.env.example`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
NITRO_PRESET=vercel
```

You get these from:

```txt
Supabase Dashboard -> Project Settings -> API
```

Use the `anon public` key or the new `publishable` key. Do **not** put the `service_role` key in Vercel frontend env vars.

## 4) Vercel environment variables

In Vercel project:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
NITRO_PRESET=vercel
```

Build settings:

```txt
Install Command: bun install
Build Command: bun run build
Framework Preset: Other / Vite is fine
```

The project now pins Nitro to Vercel in `vite.config.ts`:

```ts
nitro: { preset: "vercel" }
```

## 5) What I fixed in login

- Removed Lovable Cloud OAuth from the login flow.
- Login now uses your own Supabase OAuth directly.
- Added timeouts so `/auth` cannot stay forever on the spinner.
- Added client fallback profile creation if an old user exists without a `profiles` row.
- Backfilled existing Supabase users in the current database.
- Supabase linter is clean: no RLS/security warnings.
