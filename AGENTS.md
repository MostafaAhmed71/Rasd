# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
An Arabic (RTL) React + Vite PWA ("بوابة أعضاء هيئة التدريس") for recording field-training
grades. There is **no custom backend**: the app talks directly to **Supabase**
(Postgres + Auth + Row Level Security) via `@supabase/supabase-js`. All app code lives in
`app/`. Standard scripts are in `app/package.json` (`dev`, `build`, `lint`, `preview`) — use
those; they are not duplicated here.

### Services
| Service | Dir | Start command | Notes |
|---|---|---|---|
| Vite dev server (the app) | `app/` | `npm run dev` (add `-- --host` to expose) → http://localhost:5173 | Needs `app/.env` (see below). |
| Supabase (Postgres + Auth) | repo root | `supabase start` | Runs locally in Docker; applies `supabase/migrations/*` + `supabase/seed.sql` automatically. |

There is **no automated test suite**. Verify changes via `npm run lint` + `npm run build`
(both in `app/`) and by exercising the running app.

### Local backend startup (do this each session before running the app)
The local Supabase stack runs in Docker and is **not** started by the update script.

1. Ensure the Docker daemon is running (a fresh VM may not auto-start it). If `docker ps`
   fails, start it: `sudo bash -c 'nohup dockerd >/var/log/dockerd.log 2>&1 &'` then
   `sudo chmod 666 /var/run/docker.sock`.
2. From the repo root: `supabase start` (prints the local URL + keys; re-run `supabase status`
   any time to see them).
3. Create `app/.env` (git-ignored) pointing at local Supabase. The local anon key is the
   fixed Supabase demo key:
   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
   ```
4. Create the admin account (idempotent-ish; errors if it already exists): from `app/`,
   `node scripts/create-admin.mjs` → logs in as **admin@g.com / admin123** (role `admin`).
   Instructor accounts are created the same way (edit the script) or via Supabase Studio at
   http://localhost:54323.

### Non-obvious gotchas
- **Grants / `supabase/seed.sql` (important):** Hosted Supabase auto-grants `public` tables to
  `anon`/`authenticated`, so the migrations contain no `GRANT`s. The local CLI does **not** do
  this for the `postgres` role that applies migrations, so without help the API fails with
  `permission denied for table ...` and login/imports silently do nothing. `supabase/seed.sql`
  restores those grants and is applied automatically on `supabase start` / `supabase db reset`.
  If you add tables in a migration, they'll be covered by the `alter default privileges` in the
  seed after a `db reset`.
- **`.env` is git-ignored** and must be recreated after a fresh checkout (values above). The app
  throws on startup if the two `VITE_SUPABASE_*` vars are missing.
- **`supabase db reset`** wipes all data (including the admin user); re-run `create-admin.mjs`
  after a reset. `supabase start` alone preserves data across restarts.
- Docker uses the `fuse-overlayfs` storage driver with the containerd snapshotter disabled
  (`/etc/docker/daemon.json`); this is required for Docker-in-VM here.
- The production deploy (Vercel/Netlify) only builds `app/` and uses a hosted Supabase project;
  `supabase/config.toml` and `supabase/seed.sql` are for **local dev only** and don't affect it.
