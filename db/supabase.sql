-- 轻创图文（LightCreate Graphic）基础库（Supabase / Postgres）
-- 在 Supabase SQL Editor 中运行本脚本
-- 说明：本脚本仅包含最小可用的模板、作品与策略；如需完整功能请使用 complete_supabase.sql

-- 1) 必要扩展
create extension if not exists pgcrypto with schema extensions;

-- 2) 模板表
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

-- 3) 作品表（允许匿名期使用 client_uid；后续可接入用户体系）
create table if not exists public.works (
  work_id uuid primary key default extensions.gen_random_uuid(),
  client_uid text not null,
  user_id uuid,
  work_name text,
  scene_type text,
  template_id text,
  work_data jsonb not null,
  preview_url text,
  is_private boolean default false,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4) 索引
create index if not exists idx_works_client on public.works(client_uid);
create index if not exists idx_templates_scene on public.templates(scene_type);

-- 5) 触发器：自动更新时间
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_templates_updated on public.templates;
create trigger trg_templates_updated before update on public.templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_works_updated on public.works;
create trigger trg_works_updated before update on public.works
for each row execute function public.set_updated_at();

-- 6) 启用 RLS（原型期开放读写；上线前请收紧策略）
alter table public.templates enable row level security;
alter table public.works enable row level security;

do $$ begin
  create policy templates_select_all on public.templates for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy works_insert_all on public.works for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy works_select_all on public.works for select using (true);
exception when duplicate_object then null; end $$;

-- 7) 可选：示例模板数据
insert into public.templates (template_id, scene_type, template_name, cover_color, template_data)
values
  ('tpl_social_01','social','清新分享卡片','#EAF5FF', '{"size":{"w":1080,"h":1080},"backgroundColor":"#EAF5FF","elements":[{"id":"t1","type":"text","text":"今日好物分享","color":"#111","fontSize":72,"x":540,"y":160,"align":"center"},{"id":"r1","type":"rect","color":"#07c160","width":720,"height":4,"x":540,"y":230}] }'::jsonb),
  ('tpl_ecomm_01','ecommerce','电商主图简洁','#FFF3E0', '{"size":{"w":800,"h":800},"backgroundColor":"#FFF3E0","elements":[{"id":"t2","type":"text","text":"本周特惠","color":"#E65100","fontSize":96,"x":400,"y":200,"align":"center"},{"id":"t3","type":"text","text":"限时9.9","color":"#111","fontSize":64,"x":400,"y":320,"align":"center"}] }'::jsonb)
on conflict (template_id) do nothing;
