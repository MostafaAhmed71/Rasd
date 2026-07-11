-- Local development seed.
--
-- On hosted Supabase, tables created in the `public` schema are automatically
-- granted to the API roles (`anon`, `authenticated`, `service_role`) via the
-- project's default privileges, so the app's migrations don't include GRANTs.
--
-- The local Supabase CLI's default privileges for the `postgres` role (which
-- applies the migrations) do NOT grant SELECT/INSERT/UPDATE/DELETE to those
-- roles, so without this seed the PostgREST API returns "permission denied for
-- table ..." and login/imports fail. Row Level Security still governs which
-- rows each role can actually access.
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
