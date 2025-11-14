-- 轻创图文（LightCreate Graphic）基础库（Supabase / Postgres）
-- 执行前：在 Supabase SQL Editor 中运行本脚本
-- 依赖扩展（用于 gen_random_uuid）
create extension if not exists pgcrypto;

-- 模板表 templates
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
  create_time timestamptz default now(),
  update_time timestamptz default now()
);

-- 作品表 works（雏形阶段允许 anon 访问；后续接入 Auth 后收紧策略）
create table if not exists public.works (
  work_id uuid primary key default gen_random_uuid(),
  client_uid text not null, -- 小程序本地生成的客户端ID（雏形阶段）
  user_id uuid,            -- 预留：接入 Supabase Auth 后使用
  work_name text,
  scene_type text,
  template_id text,
  work_data jsonb not null,
  preview_url text,
  is_private boolean default false,
  status text default 'active',
  create_time timestamptz default now(),
  update_time timestamptz default now()
);

-- 索引
create index if not exists idx_works_client on public.works(client_uid);
create index if not exists idx_templates_scene on public.templates(scene_type);

-- RLS 策略（注意：为便于雏形联调，策略较宽松，正式上线前务必收紧）
alter table public.templates enable row level security;
alter table public.works enable row level security;

-- 模板：任何人可读
do $$ begin
  create policy templates_read on public.templates for select using (true);
exception when duplicate_object then null; end $$;

-- 作品：雏形阶段允许匿名插入与读取；后续建议基于 auth.uid() 收紧
do $$ begin
  create policy works_insert on public.works for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy works_select on public.works for select using (true);
exception when duplicate_object then null; end $$;

-- 触发器：自动更新时间
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.update_time = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_templates_updated on public.templates;
create trigger trg_templates_updated before update on public.templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_works_updated on public.works;
create trigger trg_works_updated before update on public.works
for each row execute function public.set_updated_at();

-- 可选：初始化示例模板
insert into public.templates (template_id, scene_type, template_name, cover_color, template_data)
values
  ('tpl_social_01','xiaohongshu','清新分享卡片','#EAF5FF', '{"size":{"w":1080,"h":1080},"backgroundColor":"#EAF5FF","elements":[{"id":"t1","type":"text","text":"今日好物分享","color":"#111","fontSize":72,"x":540,"y":160,"align":"center"},{"id":"r1","type":"rect","color":"#07c160","width":720,"height":4,"x":540,"y":230}] }'::jsonb),
  ('tpl_ecomm_01','ecomm_main','电商主图简约','#FFF3E0', '{"size":{"w":800,"h":800},"backgroundColor":"#FFF3E0","elements":[{"id":"t2","type":"text","text":"本周特惠","color":"#E65100","fontSize":96,"x":400,"y":200,"align":"center"},{"id":"t3","type":"text","text":"限时9.9起","color":"#111","fontSize":64,"x":400,"y":320,"align":"center"}] }'::jsonb)
on conflict (template_id) do nothing;
