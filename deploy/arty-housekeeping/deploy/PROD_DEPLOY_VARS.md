Production deploy variables
==========================

Set these env vars before running `deploy_prod.sh` or `deploy_prod.ps1`.

Required for pushing images:
- `GHCR_USER` - GitHub user/org for pushing to GHCR
- `GHCR_TOKEN` - PAT with packages:write (or use GITHUB_TOKEN in Actions)

Optional (but recommended):
- `RENDER_API_KEY` and `RENDER_SERVICE_ID` - to trigger Render service deploys
- `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` - to trigger Vercel deployments
- `CF_API_TOKEN`, `CF_ZONE_ID`, `CF_RECORD_NAME`, `CF_TARGET` - to create/update Cloudflare DNS

Supabase (must be configured separately):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `SUPABASE_ANON_KEY` (frontend only; expose as NEXT_PUBLIC_SUPABASE_ANON_KEY)
- `SUPABASE_JWT_SECRET` (for Express JWT verification if using Supabase tokens)

Other recommended server envs:
- `JWT_SECRET` - fallback local JWT secret
- `ADMIN_EMAILS` - comma-separated admin emails
- `ALLOW_UNAUTH_WEBHOOKS` - set to `false` in production
