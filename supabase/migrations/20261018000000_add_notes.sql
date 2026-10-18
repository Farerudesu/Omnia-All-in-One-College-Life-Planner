-- Migration: 20261018000000_add_notes.sql
-- Description: Adds the notes table, indexes, trigger, search RPC, and user profile preference for Omni notes access.

-- 1. Create table notes
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  content text not null default '' check (char_length(content) <= 50000),
  tags text[] not null default '{}' check (
    cardinality(tags) <= 10 and
    (select bool_and(char_length(t) <= 30) from unnest(tags) as t) is not false
  ),
  color text null,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  course_id uuid null,
  assignment_id uuid null,
  event_id uuid null,
  source text not null default 'manual' check (source in ('manual', 'omni')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored
);

-- Foreign key constraints with ON DELETE SET NULL if target tables exist
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'classes') then
    if (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'classes' and column_name = 'id') = 'uuid' then
      if not exists (select 1 from pg_constraint where conname = 'fk_notes_course') then
        alter table public.notes add constraint fk_notes_course foreign key (course_id) references public.classes(id) on delete set null;
      end if;
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'assignments') then
    if (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'assignments' and column_name = 'id') = 'uuid' then
      if not exists (select 1 from pg_constraint where conname = 'fk_notes_assignment') then
        alter table public.notes add constraint fk_notes_assignment foreign key (assignment_id) references public.assignments(id) on delete set null;
      end if;
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'events') then
    if (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'events' and column_name = 'id') = 'uuid' then
      if not exists (select 1 from pg_constraint where conname = 'fk_notes_event') then
        alter table public.notes add constraint fk_notes_event foreign key (event_id) references public.events(id) on delete set null;
      end if;
    end if;
  end if;
exception when others then
  -- Keep notes columns flexible if foreign key linking is omitted or types vary
  null;
end $$;

-- 2. Trigger updated_at otomatis
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

-- 3. Indexes for fast filtering, tags search, and full-text search
create index if not exists idx_notes_user_archive_updated on public.notes(user_id, is_archived, updated_at desc);
create index if not exists idx_notes_tags on public.notes using gin(tags);
create index if not exists idx_notes_fts on public.notes using gin(fts);

-- 4. Enable Row Level Security (RLS) & Policies
alter table public.notes enable row level security;

drop policy if exists "Users can view own notes" on public.notes;
create policy "Users can view own notes"
  on public.notes for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own notes" on public.notes;
create policy "Users can insert own notes"
  on public.notes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes"
  on public.notes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes"
  on public.notes for delete
  to authenticated
  using (user_id = auth.uid());

-- 5. RPC search_notes for full-text search (security invoker)
create or replace function public.search_notes(
  q text,
  limit_n int default 20
)
returns setof public.notes
language sql
security invoker
set search_path = public, pg_catalog
stable
as $$
  select *
  from public.notes
  where user_id = auth.uid()
    and not is_archived
    and (
      q is null
      or trim(q) = ''
      or fts @@ websearch_to_tsquery('simple', q)
      or title ilike '%' || q || '%'
    )
  order by
    case
      when q is not null and trim(q) <> '' then ts_rank(fts, websearch_to_tsquery('simple', q))
      else 0
    end desc,
    updated_at desc
  limit coalesce(limit_n, 20);
$$;

-- 6. Add preference column to profiles table
alter table if exists public.profiles
  add column if not exists omni_notes_access boolean not null default false;
