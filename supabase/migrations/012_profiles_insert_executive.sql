-- Allow executive to insert profiles when creating users (upsert path)
drop policy if exists "profiles_insert_admin" on profiles;
create policy "profiles_insert_admin"
  on profiles for insert
  with check (is_executive());
