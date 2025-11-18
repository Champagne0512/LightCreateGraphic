-- Create public avatars bucket and open minimal policies for Mini Program uploads

-- 1) Create bucket (idempotent)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- 2) Policies for storage.objects
-- Note: Using anon key from Mini Program => role = anon; no auth.uid().
-- Dev-friendly: allow anon read/insert/update for bucket 'avatars'. Tighten for production.

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars_select_anon'
  ) then
    create policy avatars_select_anon on storage.objects for select
      using (bucket_id = 'avatars');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars_insert_anon'
  ) then
    create policy avatars_insert_anon on storage.objects for insert
      with check (bucket_id = 'avatars');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars_update_anon'
  ) then
    create policy avatars_update_anon on storage.objects for update
      using (bucket_id = 'avatars') with check (bucket_id = 'avatars');
  end if;
end $$;

-- optional: delete (if you want users to replace/remove files)
-- do $$ begin
--   if not exists (
--     select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars_delete_anon'
--   ) then
--     create policy avatars_delete_anon on storage.objects for delete
--       using (bucket_id = 'avatars');
--   end if;
-- end $$;

