ONE-CLICK SAAS DEPLOY

This guide and workflow enable a one-click SaaS deployment using GitHub Actions.

Secrets required (set in the repository Settings -> Secrets):
- `GITHUB_TOKEN` (provided by Actions)
- `GHCR_PAT` (optional) for GHCR push if not using GITHUB_TOKEN
- `RENDER_API_KEY` (optional) — to trigger Render service deploys
- `RENDER_SERVICE_ID` (optional)
- `VERCEL_TOKEN` (optional) — to trigger Vercel deployments
- `VERCEL_PROJECT_ID` (optional)
- `EXPRESS_URL` (optional) — used for post-deploy health checks

How it works
1. Run the `SaaS One-Click Deploy` workflow from the Actions tab (workflow_dispatch).
2. The workflow builds Docker images for the Node API and Next app, pushes them to GHCR under your account.
3. If you provided `RENDER_API_KEY` / `RENDER_SERVICE_ID` or `VERCEL_TOKEN` / `VERCEL_PROJECT_ID`, the workflow will also call the provider APIs to trigger a deploy.

Local one-click (docker compose)
1. Create a `.env` file next to `docker-compose.yml` with at least:
   - `JWT_SECRET=dev-secret`
   - `SUPABASE_URL=` (optional)
   - `SUPABASE_ANON_KEY=` (optional)
   - `SUPABASE_SERVICE_ROLE_KEY=` (optional)
2. Run:
```
docker compose up --build
```

Notes
- This workflow is a starting point; provider API calls require the correct permissions and may need additional payloads (for Vercel you may prefer using the official Vercel GitHub Action).
- Keep service-role keys secret. For production, use the provider secret stores.
