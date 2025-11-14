Deployment Guide — ARTY Housekeeping (Minimal secure stack)

This doc shows a pragmatic, low-cost deployment that balances security and simplicity:

- Next.js frontend (Vercel)
- Express API (Render or Railway)
- Postgres + Auth (Supabase or Neon)
- Optional: Cloudflare Worker for edge auth/validation

Prerequisites
- Git repo with this project
- Accounts on Vercel, Render (or Railway), Supabase, and Cloudflare (if using Workers)

1) Deploy Next.js to Vercel
- Push `deploy/arty-housekeeping/next-app` to your repo (or set Vercel project root).
- In Vercel project settings, add Environment Variables:
  - `NEXT_PUBLIC_API_URL` => `https://your-express.example` (or point to Render)
  - `JWT_SECRET` => (random secret for dev; for production use IdP tokens)
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (optional, if using Supabase client from frontend)
- Deploy. Vercel will handle HTTPS, static assets, SSR.

2) Deploy Express API to Render or Railway
- Push `deploy/arty-housekeeping/node-server` as a service.
- Render/Railway settings:
  - Build command: `npm install`
  - Start command: `node index.js`
  - Environment Variables (secure):
    - `JWT_SECRET` (must match Next.js usage or Supabase JWT verification secret)
    - `DATABASE_URL` or `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`
    - `ALLOW_UNAUTH_WEBHOOKS=false`
    - `PORT` (Render sets this automatically)
- Ensure `node-server/db.js` envs are configured to connect to Supabase/Neon. Run `node-server/sql/init_db.sql` against the DB to create schema.

3) Provision Supabase (Postgres + Auth)
- Create a new project in Supabase.
- In Supabase > Settings > API, copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` and the `SERVICE_ROLE_KEY` (store the service role in server-side only — e.g., in Render variables).
- Create the `canonical_reservations` table using `deploy/arty-housekeeping/node-server/sql/init_db.sql` or via the SQL editor.
- If using Supabase Auth, set up your users/roles and policies. Use server-side calls (Next.js API) with `SERVICE_ROLE_KEY` for admin writes only.

4) Replace dev login with Supabase Auth (recommended)
- Flow: Next.js uses Supabase Auth for user sign-in. The frontend receives an access token and includes it as `Authorization: Bearer <token>` when calling protected API endpoints.
- On the Express side, verify JWTs using the Supabase JWT secret (or use Supabase REST / server-side session verification).

5) Optional: Cloudflare Worker for edge token validation
- Use a small Worker to validate tokens and forward requests to the Express API. Useful for pre-validation, caching, or geo-routing.
- Keep Workers minimal: verify signature, check role, then forward.

6) Secrets and security
- Use platform secret managers: Vercel/Render environment variables.
- Rotate `JWT_SECRET` and `SERVICE_ROLE_KEY` regularly.
- Set `ALLOW_UNAUTH_WEBHOOKS=false` in production.

7) Monitoring & backups
- Enable Supabase automated backups.
- Use platform logs (Render, Vercel) and add Sentry or another error tracker to catch 5xx.

Quick dev startup (local)
```
# Next app
cd deploy/arty-housekeeping/next-app
npm install
npm run dev

# Node API
cd ../node-server
npm install
$env:JWT_SECRET='dev-secret'
$env:ALLOW_UNAUTH_WEBHOOKS='true'
node index.js
```

Notes
- This guide is intentionally minimal: it avoids an extra orchestration layer and recommends managed DB/auth (Supabase) to reduce ops burden.
- If you want, I can (A) implement Supabase Auth in the Next.js app and wire Express to verify Supabase tokens, (B) add a Cloudflare Worker template, or (C) add a GitHub Actions workflow to deploy and validate schema files on PRs.
