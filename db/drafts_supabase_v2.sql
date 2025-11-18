-- Drafts & Versions (safe v2) – single-run, idempotent, with corrected default parameter order

-- 0) Extensions
create extension if not exists pgcrypto with schema extensions;

-- 1) Tables
create table if not exists public.drafts (
  draft_id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid,
  client_uid text,
  name text not null,
  size jsonb,
  latest_version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.draft_versions (
  version_id uuid primary key default extensions.gen_random_uuid(),
  draft_id uuid not null references public.drafts(draft_id) on delete cascade,
  version_no int not null,
  work_data jsonb not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_drafts_user_client on public.drafts(user_id, client_uid);
create index if not exists idx_draft_versions_draft on public.draft_versions(draft_id, version_no desc);

-- 2) Updated-at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_drafts_updated on public.drafts;
create trigger trg_drafts_updated before update on public.drafts for each row execute function public.set_updated_at();

-- 3) RLS (dev-open; tighten before production)
alter table public.drafts enable row level security;
alter table public.draft_versions enable row level security;
do $$ begin
  create policy drafts_all on public.drafts for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy draft_versions_all on public.draft_versions for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- 4) Drop legacy functions (best-effort)
do $$ begin
  perform 1;
  begin perform 1; drop function if exists public.upsert_draft(uuid, uuid, text, text, jsonb, jsonb, text); exception when others then null; end;
  begin perform 1; drop function if exists public.upsert_draft(uuid, uuid, text, text, jsonb, jsonb); exception when others then null; end;
  begin perform 1; drop function if exists public.upsert_draft(text, jsonb, jsonb, uuid, uuid, text); exception when others then null; end;
  begin perform 1; drop function if exists public.list_drafts(uuid, text); exception when others then null; end;
  begin perform 1; drop function if exists public.get_draft(uuid); exception when others then null; end;
  begin perform 1; drop function if exists public.list_draft_versions(uuid); exception when others then null; end;
  begin perform 1; drop function if exists public.delete_draft(uuid); exception when others then null; end;
  begin perform 1; drop function if exists public.restore_draft_version(uuid, int, text); exception when others then null; end;
end $$;

-- 5) RPCs (correct default param order)
create or replace function public.upsert_draft(
  p_name       text,
  p_size       jsonb,
  p_work_data  jsonb,
  p_draft_id   uuid default null,
  p_user_id    uuid default null,
  p_client_uid text default null,
  p_note       text default null
)
returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_latest int; v_row public.drafts;
begin
  if p_name is null or p_size is null or p_work_data is null then
    return json_build_object('success', false, 'message', 'name/size/work_data is required');
  end if;

  if p_draft_id is null then
    insert into public.drafts(user_id, client_uid, name, size)
    values (p_user_id, p_client_uid, p_name, p_size)
    returning draft_id, latest_version into v_id, v_latest;
  else
    insert into public.drafts(draft_id, user_id, client_uid, name, size)
    values (p_draft_id, p_user_id, p_client_uid, p_name, p_size)
    on conflict (draft_id) do update
      set name = excluded.name,
          size = excluded.size,
          user_id = coalesce(excluded.user_id, public.drafts.user_id),
          client_uid = coalesce(excluded.client_uid, public.drafts.client_uid)
    returning draft_id, latest_version into v_id, v_latest;
  end if;

  v_latest := coalesce(v_latest, 0) + 1;
  update public.drafts set latest_version = v_latest where draft_id = v_id;
  insert into public.draft_versions(draft_id, version_no, work_data, note)
  values (v_id, v_latest, p_work_data, p_note);

  select * into v_row from public.drafts where draft_id = v_id;
  return json_build_object('success', true, 'draft_id', v_id, 'version_no', v_latest, 'draft', v_row);
end $$;
grant execute on function public.upsert_draft(text, jsonb, jsonb, uuid, uuid, text, text) to anon, authenticated;

create or replace function public.list_drafts(p_user_id uuid default null, p_client_uid text default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  return json_build_object('success', true, 'items', (
    select coalesce(json_agg(x), '[]'::json) from (
      select draft_id, name, size, latest_version, to_char(updated_at,'YYYY-MM-DD HH24:MI') as updated_at
      from public.drafts
      where (p_user_id is not null and user_id = p_user_id)
         or (p_user_id is null and p_client_uid is not null and client_uid = p_client_uid)
      order by updated_at desc
    ) x
  ));
end $$;
grant execute on function public.list_drafts(uuid, text) to anon, authenticated;

create or replace function public.get_draft(p_draft_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v public.drafts; d json; begin
  select * into v from public.drafts where draft_id = p_draft_id;
  if not found then return json_build_object('success', false, 'message', 'Draft not found'); end if;
  select work_data into d from public.draft_versions where draft_id = p_draft_id and version_no = v.latest_version;
  return json_build_object('success', true, 'work', d, 'draft', v);
end $$;
grant execute on function public.get_draft(uuid) to anon, authenticated;

create or replace function public.list_draft_versions(p_draft_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  return json_build_object('success', true, 'versions', (
    select coalesce(json_agg(x), '[]'::json) from (
      select version_no as no, to_char(created_at,'YYYY-MM-DD HH24:MI') as ts, note
      from public.draft_versions where draft_id = p_draft_id order by version_no desc
    ) x
  ));
end $$;
grant execute on function public.list_draft_versions(uuid) to anon, authenticated;

create or replace function public.delete_draft(p_draft_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  delete from public.drafts where draft_id = p_draft_id;
  return json_build_object('success', true);
end $$;
grant execute on function public.delete_draft(uuid) to anon, authenticated;

create or replace function public.restore_draft_version(p_draft_id uuid, p_version_no int, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v public.drafts; src jsonb; latest int; begin
  select * into v from public.drafts where draft_id = p_draft_id;
  if not found then return json_build_object('success', false, 'message', 'Draft not found'); end if;
  select work_data into src from public.draft_versions where draft_id = p_draft_id and version_no = p_version_no;
  if src is null then return json_build_object('success', false, 'message', 'Version not found'); end if;
  latest := v.latest_version + 1;
  update public.drafts set latest_version = latest where draft_id = p_draft_id;
  insert into public.draft_versions(draft_id, version_no, work_data, note)
  values (p_draft_id, latest, src, coalesce(p_note, concat('restore from v', p_version_no)));
  return json_build_object('success', true, 'version_no', latest);
end $$;
grant execute on function public.restore_draft_version(uuid, int, text) to anon, authenticated;

