-- تلخيصات الطلبة (بتظهر في البروفايل). شغّله مرة واحدة في Supabase ← SQL Editor.
create table if not exists public.summaries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  subject_name text check (subject_name is null or char_length(subject_name) <= 80),
  body         text check (body is null or char_length(body) <= 20000),
  file_ref     text,
  file_name    text,
  is_public    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists summaries_user_created_idx on public.summaries (user_id, created_at desc);

drop trigger if exists summaries_touch_updated_at on public.summaries;
create trigger summaries_touch_updated_at
  before update on public.summaries
  for each row execute function public.touch_updated_at();

alter table public.summaries enable row level security;

drop policy if exists "summaries_select" on public.summaries;
create policy "summaries_select" on public.summaries for select to authenticated
  using (is_public or user_id = auth.uid());

drop policy if exists "summaries_insert" on public.summaries;
create policy "summaries_insert" on public.summaries for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "summaries_update" on public.summaries;
create policy "summaries_update" on public.summaries for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- صاحب التلخيص يمسح بتاعه، والأدمن يمسح أي حاجة مخالفة
drop policy if exists "summaries_delete" on public.summaries;
create policy "summaries_delete" on public.summaries for delete to authenticated
  using (
    user_id = auth.uid()
    or private.has_role(auth.uid(), 'admin')
    or private.has_role(auth.uid(), 'super_admin')
  );
