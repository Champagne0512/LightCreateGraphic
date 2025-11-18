-- LightCreate Graphic – Complete Supabase schema and RPCs
-- Run in Supabase SQL editor. Development-safe defaults (open RLS); tighten before production.

-- 0) Extensions
create extension if not exists pgcrypto with schema extensions;

-- 1) Auth users (custom phone auth)
create table if not exists public.auth_users (
  id uuid primary key default extensions.gen_random_uuid(),
  phone text unique not null,
  password_hash text not null,
  name text,
  role text not null default 'user',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Profiles
create table if not exists public.profiles (
  user_id uuid primary key references public.auth_users(id) on delete cascade,
  nickname text,
  avatar_url text,
  banner_url text,
  bio text,
  location text,
  website text,
  member_status boolean default false,
  member_expire date,
  security_level text default 'standard',
  two_factor_enabled boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Privacy settings
create table if not exists public.privacy_settings (
  user_id uuid primary key references public.auth_users(id) on delete cascade,
  profile_visible boolean default true,
  works_visible boolean default true,
  show_online_status boolean default true,
  data_collection boolean default true,
  marketing_emails boolean default false,
  personalized_ads boolean default false,
  updated_at timestamptz not null default now()
);

-- 4) Notifications
create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.auth_users(id) on delete cascade,
  type text default 'system',
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  is_read boolean not null default false
);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);

-- 5) Works (if minimal schema exists, ensure columns)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='works' and column_name='user_id') then
    alter table public.works add column user_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='works' and column_name='work_name') then
    alter table public.works add column work_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='works' and column_name='preview_url') then
    alter table public.works add column preview_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='works' and column_name='is_private') then
    alter table public.works add column is_private boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='works' and column_name='created_at') then
    alter table public.works add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='works' and column_name='updated_at') then
    alter table public.works add column updated_at timestamptz not null default now();
  end if;
end $$;
create index if not exists idx_works_user on public.works(user_id, created_at desc);

-- 6) Favorites
create table if not exists public.favorites (
  id bigserial primary key,
  user_id uuid not null references public.auth_users(id) on delete cascade,
  work_id uuid references public.works(work_id) on delete cascade,
  template_id text references public.templates(template_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint one_target check ((work_id is not null) <> (template_id is not null))
);
create unique index if not exists ux_fav_user_work on public.favorites(user_id, work_id) where work_id is not null;
create unique index if not exists ux_fav_user_tpl on public.favorites(user_id, template_id) where template_id is not null;

-- 7) Updated-at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_auth_users_updated') then
    create trigger trg_auth_users_updated before update on public.auth_users for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_profiles_updated') then
    create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_privacy_updated') then
    create trigger trg_privacy_updated before update on public.privacy_settings for each row execute function public.set_updated_at();
  end if;
end $$;

-- 8) RLS (dev-open; tighten later)
alter table public.auth_users enable row level security;
alter table public.profiles enable row level security;
alter table public.privacy_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.favorites enable row level security;

do $$ begin
  create policy au_read_all on public.auth_users for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy prw_all on public.profiles for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ps_all on public.privacy_settings for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy nf_all on public.notifications for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy fav_all on public.favorites for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- 9) RPC: register_user
create or replace function public.register_user(p_phone text, p_password text, p_name text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_user public.auth_users; v_exists boolean;
begin
  select exists(select 1 from public.auth_users where phone = p_phone) into v_exists;
  if v_exists then
    return json_build_object('success', false, 'message', 'Phone already registered');
  end if;
  insert into public.auth_users(phone, password_hash, name)
  values (p_phone, extensions.crypt(p_password, extensions.gen_salt('bf')), coalesce(p_name, ''))
  returning * into v_user;
  insert into public.profiles(user_id, nickname) values (v_user.id, coalesce(p_name, '')) on conflict do nothing;
  insert into public.privacy_settings(user_id) values (v_user.id) on conflict do nothing;
  return json_build_object('success', true, 'user', json_build_object(
    'id', v_user.id, 'phone', v_user.phone, 'name', v_user.name, 'role', v_user.role, 'status', v_user.status
  ));
end $$;
grant execute on function public.register_user(text, text, text) to anon, authenticated;

-- 10) RPC: login_user
create or replace function public.login_user(p_phone text, p_password text)
returns json language plpgsql security definer set search_path = public as $$
declare v_user public.auth_users;
begin
  select * into v_user from public.auth_users where phone = p_phone limit 1;
  if not found then return json_build_object('success', false, 'message', 'User not found'); end if;
  if extensions.crypt(p_password, v_user.password_hash) <> v_user.password_hash then
    return json_build_object('success', false, 'message', 'Invalid credentials');
  end if;
  return json_build_object('success', true, 'user', json_build_object(
    'id', v_user.id, 'phone', v_user.phone, 'name', v_user.name, 'role', v_user.role, 'status', v_user.status
  ));
end $$;
grant execute on function public.login_user(text, text) to anon, authenticated;

-- 11) RPC: get_user_profile
create or replace function public.get_user_profile(p_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare u public.auth_users; p public.profiles; s public.privacy_settings;
begin
  select * into u from public.auth_users where id = p_user_id; if not found then
    return json_build_object('success', false, 'message', 'User not found'); end if;
  select * into p from public.profiles where user_id = p_user_id;
  select * into s from public.privacy_settings where user_id = p_user_id;
  return json_build_object('success', true, 'user', json_build_object(
    'id', u.id, 'phone', u.phone, 'name', u.name,
    'nickname', coalesce(p.nickname, u.name), 'avatar_url', coalesce(p.avatar_url,''),
    'bio', coalesce(p.bio,''), 'location', coalesce(p.location,''), 'website', coalesce(p.website,''),
    'banner_url', coalesce(p.banner_url,''), 'member_status', coalesce(p.member_status,false),
    'member_expire', p.member_expire, 'security_level', coalesce(p.security_level,'standard'),
    'privacy_settings', json_build_object(
      'profile_visible', coalesce(s.profile_visible,true),
      'works_visible', coalesce(s.works_visible,true),
      'show_online_status', coalesce(s.show_online_status,true)
    )
  ));
end $$;
grant execute on function public.get_user_profile(uuid) to anon, authenticated;

-- 12) RPC: update_user_profile
create or replace function public.update_user_profile(
  p_user_id uuid,
  p_name text default null,
  p_nickname text default null,
  p_avatar_url text default null,
  p_bio text default null,
  p_location text default null,
  p_website text default null,
  p_banner_url text default null
)
returns json language plpgsql security definer set search_path = public as $$
declare u public.auth_users; p public.profiles;
begin
  update public.auth_users set name = coalesce(p_name, name), updated_at = now() where id = p_user_id returning * into u;
  insert into public.profiles(user_id, nickname, avatar_url, bio, location, website, banner_url)
  values (p_user_id, p_nickname, p_avatar_url, p_bio, p_location, p_website, p_banner_url)
  on conflict (user_id) do update set
    nickname = coalesce(excluded.nickname, public.profiles.nickname),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    bio = coalesce(excluded.bio, public.profiles.bio),
    location = coalesce(excluded.location, public.profiles.location),
    website = coalesce(excluded.website, public.profiles.website),
    banner_url = coalesce(excluded.banner_url, public.profiles.banner_url),
    updated_at = now()
  returning * into p;
  return json_build_object('success', true, 'user', json_build_object(
    'id', u.id, 'phone', u.phone, 'name', u.name,
    'nickname', p.nickname, 'avatar_url', p.avatar_url, 'bio', p.bio, 'location', p.location,
    'website', p.website, 'banner_url', p.banner_url
  ));
end $$;
grant execute on function public.update_user_profile(uuid, text, text, text, text, text, text, text) to anon, authenticated;

-- 13) RPC: get_user_stats
create or replace function public.get_user_stats(p_user_id uuid, p_client_uid text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_works int := 0; v_fav int := 0; v_drafts int := 0;
begin
  if p_user_id is not null then
    select count(*) into v_works from public.works where user_id = p_user_id;
    select count(*) into v_fav from public.favorites where user_id = p_user_id;
  elsif p_client_uid is not null then
    select count(*) into v_works from public.works where client_uid = p_client_uid;
  end if;
  return json_build_object('success', true, 'stats', json_build_object(
    'works', coalesce(v_works,0), 'favorites', coalesce(v_fav,0), 'drafts', coalesce(v_drafts,0)
  ));
end $$;
grant execute on function public.get_user_stats(uuid, text) to anon, authenticated;

-- 14) RPC: update_user_password
create or replace function public.update_user_password(p_user_id uuid, p_old_password text, p_new_password text)
returns json language plpgsql security definer set search_path = public as $$
declare v_user public.auth_users;
begin
  select * into v_user from public.auth_users where id = p_user_id;
  if not found then return json_build_object('success', false, 'message', 'User not found'); end if;
  if extensions.crypt(p_old_password, v_user.password_hash) <> v_user.password_hash then
    return json_build_object('success', false, 'message', 'Old password incorrect');
  end if;
  update public.auth_users set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')), updated_at = now() where id = p_user_id;
  return json_build_object('success', true, 'message', 'Password updated');
end $$;
grant execute on function public.update_user_password(uuid, text, text) to anon, authenticated;

-- 15) RPC: two factor toggles (placeholder)
create or replace function public.enable_two_factor_auth(p_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set two_factor_enabled = true, updated_at = now() where user_id = p_user_id;
  return json_build_object('success', true, 'qrCode', null);
end $$;
grant execute on function public.enable_two_factor_auth(uuid) to anon, authenticated;

create or replace function public.disable_two_factor_auth(p_user_id uuid, p_code text)
returns json language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set two_factor_enabled = false, updated_at = now() where user_id = p_user_id;
  return json_build_object('success', true);
end $$;
grant execute on function public.disable_two_factor_auth(uuid, text) to anon, authenticated;

-- 16) RPC: notifications CRUD
create or replace function public.get_user_notifications(p_user_id uuid, p_page int default 1, p_page_size int default 20)
returns json language plpgsql security definer set search_path = public as $$
declare v_total int; v_rows json;
begin
  select count(*) into v_total from public.notifications where user_id = p_user_id;
  select coalesce(json_agg(x), '[]'::json) into v_rows from (
    select id, type, title, content, to_char(created_at, 'YYYY-MM-DD HH24:MI') as time, is_read as read
    from public.notifications
    where user_id = p_user_id
    order by created_at desc
    offset greatest(p_page-1,0)*p_page_size limit p_page_size
  ) as x;
  return json_build_object('success', true, 'notifications', v_rows, 'total', v_total);
end $$;
grant execute on function public.get_user_notifications(uuid, int, int) to anon, authenticated;

create or replace function public.mark_notification_read(p_user_id uuid, p_notification_id bigint)
returns json language plpgsql security definer set search_path = public as $$
begin
  update public.notifications set is_read = true where id = p_notification_id and user_id = p_user_id;
  return json_build_object('success', true);
end $$;
grant execute on function public.mark_notification_read(uuid, bigint) to anon, authenticated;

create or replace function public.delete_notification(p_user_id uuid, p_notification_id bigint)
returns json language plpgsql security definer set search_path = public as $$
begin
  delete from public.notifications where id = p_notification_id and user_id = p_user_id;
  return json_build_object('success', true);
end $$;
grant execute on function public.delete_notification(uuid, bigint) to anon, authenticated;

-- 17) RPC: privacy settings
create or replace function public.get_privacy_settings(p_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare s public.privacy_settings;
begin
  select * into s from public.privacy_settings where user_id = p_user_id;
  if not found then
    insert into public.privacy_settings(user_id) values (p_user_id) returning * into s;
  end if;
  return json_build_object('success', true, 'settings', json_build_object(
    'profile_visible', coalesce(s.profile_visible, true),
    'works_visible', coalesce(s.works_visible, true),
    'show_online_status', coalesce(s.show_online_status, true),
    'data_collection', coalesce(s.data_collection, true),
    'marketing_emails', coalesce(s.marketing_emails, false),
    'personalized_ads', coalesce(s.personalized_ads, false)
  ));
end $$;
grant execute on function public.get_privacy_settings(uuid) to anon, authenticated;

create or replace function public.update_privacy_settings(p_user_id uuid, p_settings jsonb)
returns json language plpgsql security definer set search_path = public as $$
begin
  insert into public.privacy_settings(user_id, profile_visible, works_visible, show_online_status, data_collection, marketing_emails, personalized_ads)
  values (
    p_user_id,
    coalesce((p_settings->>'profile_visible')::boolean, true),
    coalesce((p_settings->>'works_visible')::boolean, true),
    coalesce((p_settings->>'show_online_status')::boolean, true),
    coalesce((p_settings->>'data_collection')::boolean, true),
    coalesce((p_settings->>'marketing_emails')::boolean, false),
    coalesce((p_settings->>'personalized_ads')::boolean, false)
  )
  on conflict (user_id) do update set
    profile_visible = coalesce((p_settings->>'profile_visible')::boolean, public.privacy_settings.profile_visible),
    works_visible = coalesce((p_settings->>'works_visible')::boolean, public.privacy_settings.works_visible),
    show_online_status = coalesce((p_settings->>'show_online_status')::boolean, public.privacy_settings.show_online_status),
    data_collection = coalesce((p_settings->>'data_collection')::boolean, public.privacy_settings.data_collection),
    marketing_emails = coalesce((p_settings->>'marketing_emails')::boolean, public.privacy_settings.marketing_emails),
    personalized_ads = coalesce((p_settings->>'personalized_ads')::boolean, public.privacy_settings.personalized_ads),
    updated_at = now();
  return json_build_object('success', true);
end $$;
grant execute on function public.update_privacy_settings(uuid, jsonb) to anon, authenticated;

-- 18) RPC: dashboard stats (optional for admin)
create or replace function public.get_dashboard_stats()
returns json language plpgsql security definer set search_path = public as $$
declare a int; b int; c int; d int;
begin
  select count(*) into a from public.auth_users;
  select count(*) into b from public.templates where status='active';
  select count(*) into c from public.works; 
  select count(*) into d from public.auth_users where updated_at > now() - interval '7 days';
  return json_build_object('totalUsers', a, 'totalTemplates', b, 'totalWorks', c, 'activeUsers', d);
end $$;
grant execute on function public.get_dashboard_stats() to anon, authenticated;

-- 19) Seed system notification (optional)
do $$ begin
  if exists(select 1 from public.auth_users limit 1) then
    insert into public.notifications(user_id, type, title, content)
    select id, 'system', '欢迎使用轻创图文', '这是您的系统欢迎通知。' from public.auth_users
    on conflict do nothing;
  end if;
end $$;
