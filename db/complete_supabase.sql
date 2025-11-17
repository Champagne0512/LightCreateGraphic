-- =============================================
-- LightCreateGraphic 轻创图文 - Supabase 完整数据库脚本
-- 适配 Supabase SQL Editor，可多次安全执行
-- 日期：2025-11-17
-- =============================================

-- 扩展
create extension if not exists pgcrypto with schema extensions;   -- 提供 gen_random_uuid / crypt / gen_salt
create extension if not exists pgjwt with schema extensions;      -- 可选：如需自签 JWT 可启用（非必须）

-- =============================================
-- 用户表（自管，适配小程序手机号+密码登录原型）
-- 说明：如使用 Supabase Auth，请改为使用 auth.users + profiles 方案
-- =============================================
create table if not exists public.app_users (
  id uuid primary key default extensions.gen_random_uuid(),
  phone text unique not null,
  password_hash text not null,
  name text,
  avatar_url text,
  role text default 'user' check (role in ('user','admin')),
  status text default 'active' check (status in ('active','inactive','banned')),
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_app_users_phone on public.app_users(phone);

-- 更新时间触发器
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_app_users_updated on public.app_users;
create trigger trg_app_users_updated before update on public.app_users
for each row execute function public.set_updated_at();

-- =============================================
-- 模板与作品
-- =============================================
create table if not exists public.templates (
  template_id text primary key,
  scene_type text not null,
  template_name text not null,
  cover_color text default '#ffffff',
  is_premium boolean default false,
  price numeric default 0,
  preview_url text,
  template_data jsonb not null,
  materials jsonb default '[]'::jsonb,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_templates_updated on public.templates;
create trigger trg_templates_updated before update on public.templates
for each row execute function public.set_updated_at();

create table if not exists public.works (
  work_id uuid primary key default extensions.gen_random_uuid(),
  client_uid text not null,
  user_id uuid references public.app_users(id) on delete set null,
  work_name text,
  scene_type text,
  template_id text references public.templates(template_id) on delete set null,
  work_data jsonb not null,
  preview_url text,
  is_private boolean default false,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_works_updated on public.works;
create trigger trg_works_updated before update on public.works
for each row execute function public.set_updated_at();

create index if not exists idx_works_client on public.works(client_uid);
create index if not exists idx_templates_scene on public.templates(scene_type);

-- =============================================
-- RLS 策略（原型期宽松，上线前请收紧）
-- =============================================
alter table public.templates enable row level security;
alter table public.works enable row level security;
alter table public.app_users enable row level security;

-- 模板：任何人可读
do $$ begin
  create policy templates_select_all on public.templates for select using (true);
exception when duplicate_object then null; end $$;

-- 作品：允许匿名插入/读取（原型期）
do $$ begin
  create policy works_insert_all on public.works for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy works_select_all on public.works for select using (true);
exception when duplicate_object then null; end $$;

-- 用户表：默认不开放读取；仅允许注册函数写入
do $$ begin
  create policy app_users_block_select on public.app_users for select using (false);
exception when duplicate_object then null; end $$;

-- =============================================
-- 安全函数：注册 / 登录（供 REST RPC 调用）
-- =============================================

-- 注册：写入哈希后的密码，返回精简用户信息
create or replace function public.register_user(
  p_phone text,
  p_password text,
  p_name text default null
)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_user public.app_users;
begin
  if p_phone is null or length(trim(p_phone)) = 0 then
    return json_build_object('success', false, 'message', '手机号不能为空');
  end if;
  if p_password is null or length(p_password) < 6 then
    return json_build_object('success', false, 'message', '密码至少6位');
  end if;

  insert into public.app_users(phone, password_hash, name)
  values (trim(p_phone), extensions.crypt(p_password, extensions.gen_salt('bf')), nullif(trim(p_name),''))
  returning * into v_user;

  return json_build_object(
    'success', true,
    'user', json_build_object(
      'id', v_user.id,
      'phone', v_user.phone,
      'name', coalesce(v_user.name, ''),
      'role', v_user.role,
      'status', v_user.status
    )
  );
exception when unique_violation then
  return json_build_object('success', false, 'message', '该手机号已注册');
end; $$;

revoke all on function public.register_user(text, text, text) from public;
grant execute on function public.register_user(text, text, text) to anon, authenticated;

-- 登录：校验密码，更新最后登录时间
create or replace function public.login_user(
  p_phone text,
  p_password text
)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_user public.app_users;
begin
  select * into v_user from public.app_users where phone = trim(p_phone) limit 1;
  if not found then
    return json_build_object('success', false, 'message', '用户不存在');
  end if;

  if v_user.password_hash = extensions.crypt(p_password, v_user.password_hash) then
    update public.app_users set last_login = now() where id = v_user.id;
    return json_build_object(
      'success', true,
      'user', json_build_object(
        'id', v_user.id,
        'phone', v_user.phone,
        'name', coalesce(v_user.name, ''),
        'role', v_user.role,
        'status', v_user.status
      )
    );
  else
    return json_build_object('success', false, 'message', '手机号或密码错误');
  end if;
end; $$;

revoke all on function public.login_user(text, text) from public;
grant execute on function public.login_user(text, text) to anon, authenticated;

-- =============================================
-- 最小示例数据（可多次执行）
-- =============================================
insert into public.templates (template_id, scene_type, template_name, cover_color, template_data)
values
  ('tpl_social_01','social','清新分享卡片','#EAF5FF', '{"size":{"w":1080,"h":1080},"backgroundColor":"#EAF5FF","elements":[{"id":"t1","type":"text","text":"今日好物分享","color":"#111","fontSize":72,"x":540,"y":160,"align":"center"},{"id":"r1","type":"rect","color":"#07c160","width":720,"height":4,"x":540,"y":230}] }'::jsonb),
  ('tpl_ecomm_01','ecommerce','电商主图简洁','#FFF3E0', '{"size":{"w":800,"h":800},"backgroundColor":"#FFF3E0","elements":[{"id":"t2","type":"text","text":"本周特惠","color":"#E65100","fontSize":96,"x":400,"y":200,"align":"center"},{"id":"t3","type":"text","text":"限时9.9","color":"#111","fontSize":64,"x":400,"y":320,"align":"center"}] }'::jsonb)
on conflict (template_id) do nothing;

-- 可选：初始化一个管理员账号（请在控制台手动执行一次并修改手机号与密码）
-- insert into public.app_users(phone, password_hash, name, role)
-- values ('13800000000', crypt('admin123', gen_salt('bf')), '系统管理员', 'admin')
-- on conflict (phone) do nothing;
