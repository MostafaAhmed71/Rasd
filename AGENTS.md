# AGENTS

## Cursor Cloud specific instructions

This repo is a single React + Vite + TypeScript app in `app/`, backed by Supabase. The
root `package.json` just proxies to `app/` (`npm run dev`/`npm run build` use `--prefix app`).
Standard scripts live in `app/package.json`: `dev`, `build`, `lint` (oxlint), `preview`.

The README documents connecting to a hosted Supabase project. For local development in this
environment we instead run a **local Supabase stack via Docker** so no external secrets are needed.

### Bringing up the backend (local Supabase)

Docker + the Supabase CLI are preinstalled but the daemon is not started automatically:

1. Start the Docker daemon (needs root; `/etc/docker/daemon.json` is already set to
   `fuse-overlayfs`). Run it in a background/tmux session: `sudo dockerd`.
   Then make the socket usable without sudo: `sudo chmod 666 /var/run/docker.sock`.
2. From the repo root, start Supabase: `supabase start`. This boots the stack and applies
   everything in `supabase/migrations/` automatically. Config is committed at
   `supabase/config.toml` (project id `workspace`). Get URLs/keys anytime with `supabase status`.
3. The Docker volumes may already be populated from a prior snapshot (migrations applied, an
   `admin@g.com` user present). If so, containers just need `supabase start` to resume; you do
   not need to re-run migrations or re-create the admin.

### App environment (`app/.env`, gitignored)

The app reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and throws at import if unset.
For local Supabase, `app/.env` must contain:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon key from `supabase status` ANON_KEY>
```

The local anon key is the standard Supabase demo JWT and is stable across restarts.

### Accounts / auth notes

- Email confirmation is disabled locally (`enable_confirmations = false`), so both the in-app
  `/register` flow and `node scripts/create-admin.mjs` create a usable session immediately.
- Create the admin (email `admin@g.com`, password `admin123`, role `admin`) with
  `node scripts/create-admin.mjs` (run from `app/`). New signups via `/register` get role
  `instructor` and are auto-redirected to `/instructor`.
- Roles come from `auth.users` metadata; a DB trigger mirrors users into `public.profiles`.

### Running / verifying

- Dev server: `npm run dev` in `app/` (Vite, port 5173).
- `npm run build` runs `tsc -b && vite build`; `npm run lint` runs oxlint (currently one
  non-blocking `only-export-components` warning in `AuthContext.tsx`).
