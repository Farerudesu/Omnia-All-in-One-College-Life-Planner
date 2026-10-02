create table if not exists public.share_codes (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  owner_id uuid not null,
  includes_classes boolean not null default true,
  includes_assignments boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0)
);

create table if not exists public.share_snapshots (
  code text primary key references public.share_codes(code),
  payload jsonb not null
);

alter table public.share_codes enable row level security;
alter table public.share_snapshots enable row level security;

revoke all on table public.share_codes from public, anon, authenticated;
revoke all on table public.share_snapshots from public, anon, authenticated;

create or replace function public.create_share_code(
  p_includes_classes boolean default true,
  p_includes_assignments boolean default true
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_code text;
  v_random bytea;
  v_payload jsonb;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
begin
  if v_owner_id is null then
    raise exception using errcode = '42501', message = 'Sign in to share your schedule.';
  end if;
  if not coalesce(p_includes_classes, false) and not coalesce(p_includes_assignments, false) then
    raise exception using errcode = '22023', message = 'Choose classes or assignments to share.';
  end if;

  loop
    v_random := pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || pg_catalog.substr(v_alphabet, (pg_catalog.get_byte(v_random, i) % 32) + 1, 1);
    end loop;
    begin
      insert into public.share_codes (code, owner_id, includes_classes, includes_assignments)
      values (v_code, v_owner_id, p_includes_classes, p_includes_assignments);
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  select jsonb_build_object(
    'classes', case when p_includes_classes then coalesce((
      select jsonb_agg(to_jsonb(c) - 'user_id' order by c.hari, c.jam_mulai)
      from public.classes as c
      where c.user_id = v_owner_id
    ), '[]'::jsonb) else '[]'::jsonb end,
    'assignments', case when p_includes_assignments then coalesce((
      select jsonb_agg(to_jsonb(a) - 'user_id' order by a.due_date, a.due_time)
      from public.assignments as a
      where a.user_id = v_owner_id
    ), '[]'::jsonb) else '[]'::jsonb end
  ) into v_payload;

  insert into public.share_snapshots (code, payload) values (v_code, v_payload);
  return v_code;
end;
$$;

create or replace function public.preview_share_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_share public.share_codes%rowtype;
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Sign in to join a schedule.';
  end if;

  select * into v_share
  from public.share_codes
  where code = upper(btrim(p_code));

  if not found
    or (v_share.expires_at is not null and v_share.expires_at <= now())
    or (v_share.max_uses is not null and v_share.use_count >= v_share.max_uses) then
    raise exception using errcode = 'P0001', message = 'Invalid or expired code.';
  end if;

  select payload into v_payload
  from public.share_snapshots
  where code = v_share.code;

  if v_payload is null then
    raise exception using errcode = 'P0001', message = 'Invalid or expired code.';
  end if;

  return jsonb_build_object(
    'classes', jsonb_array_length(coalesce(v_payload->'classes', '[]'::jsonb)),
    'assignments', jsonb_array_length(coalesce(v_payload->'assignments', '[]'::jsonb))
  );
end;
$$;

create or replace function public.redeem_share_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_share public.share_codes%rowtype;
  v_payload jsonb;
  v_class jsonb;
  v_assignment jsonb;
  v_old_class_id text;
  v_new_class_id uuid;
  v_class_id_map jsonb := '{}'::jsonb;
  v_class_count integer := 0;
  v_assignment_count integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Sign in to join a schedule.';
  end if;

  select * into v_share
  from public.share_codes
  where code = upper(btrim(p_code))
  for update;

  if not found
    or (v_share.expires_at is not null and v_share.expires_at <= now())
    or (v_share.max_uses is not null and v_share.use_count >= v_share.max_uses) then
    raise exception using errcode = 'P0001', message = 'Invalid or expired code.';
  end if;

  select payload into v_payload
  from public.share_snapshots
  where code = v_share.code;

  if v_payload is null then
    raise exception using errcode = 'P0001', message = 'Invalid or expired code.';
  end if;

  if v_share.includes_classes then
    for v_class in select value from jsonb_array_elements(coalesce(v_payload->'classes', '[]'::jsonb)) loop
      v_new_class_id := gen_random_uuid();
      v_old_class_id := v_class->>'id';
      if v_old_class_id is not null then
        v_class_id_map := v_class_id_map || jsonb_build_object(v_old_class_id, v_new_class_id::text);
      end if;
      insert into public.classes
      select (jsonb_populate_record(
        null::public.classes,
        v_class || jsonb_build_object('id', v_new_class_id, 'user_id', v_user_id)
      )).*;
      v_class_count := v_class_count + 1;
    end loop;
  end if;

  if v_share.includes_assignments then
    for v_assignment in select value from jsonb_array_elements(coalesce(v_payload->'assignments', '[]'::jsonb)) loop
      v_old_class_id := v_assignment->>'class_id';
      v_new_class_id := null;
      if v_old_class_id is not null then
        v_new_class_id := nullif(v_class_id_map->>v_old_class_id, '')::uuid;
      end if;
      insert into public.assignments
      select (jsonb_populate_record(
        null::public.assignments,
        v_assignment || jsonb_build_object('id', gen_random_uuid(), 'user_id', v_user_id, 'class_id', v_new_class_id)
      )).*;
      v_assignment_count := v_assignment_count + 1;
    end loop;
  end if;

  update public.share_codes
  set use_count = use_count + 1
  where code = v_share.code;

  return jsonb_build_object('classes', v_class_count, 'assignments', v_assignment_count);
end;
$$;

revoke all on function public.create_share_code(boolean, boolean) from public, anon, authenticated;
revoke all on function public.preview_share_code(text) from public, anon, authenticated;
revoke all on function public.redeem_share_code(text) from public, anon, authenticated;

grant execute on function public.create_share_code(boolean, boolean) to authenticated;
grant execute on function public.preview_share_code(text) to authenticated;
grant execute on function public.redeem_share_code(text) to authenticated;
