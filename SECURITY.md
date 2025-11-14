**ARTY Housekeeping — Security Checklist & Guidance**

This document collects the security hardening steps implemented in the repo and the remaining recommended steps before production.

Implemented in repo
- CSP and HSTS headers for Next.js in `next.config.js` (see `deploy/arty-housekeeping/next-app/next.config.js`).
- Helmet with HSTS and CSP configuration in Express (`deploy/arty-housekeeping/node-server/index.js`).
- Sentry initialization (server) when `SENTRY_DSN` is set; Next.js client/server Sentry via `NEXT_PUBLIC_SENTRY_DSN`.
- Migration SQL to create `canonical_reservations` and example RLS policies: `deploy/arty-housekeeping/migrations/001_create_canonical_reservations.sql`.
- Migration runner helper which uses `psql` if `DATABASE_URL` is provided: `deploy/arty-housekeeping/deploy/scripts/run_migration.sh`.
- Basic security CI workflow `automation/ci/validate_schemas.py` added earlier and optional security scan workflow.

Before production checklist (required)
1. Provision Supabase and run migration:
   - Use the SQL in `deploy/arty-housekeeping/migrations/001_create_canonical_reservations.sql` in the Supabase SQL editor, or run `psql "$DATABASE_URL" -f migrations/001_create_canonical_reservations.sql`.
2. Configure RLS policies to your needs:
   - The example policies allow users with `role=admin` (in JWT claims) or emails in `ADMIN_EMAILS` to insert/select.
   - For service processes, use the Supabase Service Role key server-side; service role bypasses RLS.
3. Provision secrets in provider secret stores (Vercel/Render/GitHub Secrets):
   - `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `JWT_SECRET`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `GHCR_TOKEN`, etc.
4. Ensure `ALLOW_UNAUTH_WEBHOOKS=false` in production.

Monitoring & Alerts
- Configure Sentry projects for Next.js and Node; set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` as appropriate.
- Add alerting rules in Sentry for elevated error rates or 5xx spikes.

Automated security scans (suggested)
- Add supply chain scanning (GitHub Dependabot or Snyk). Enable automated pull request fixes.
- Run OWASP ZAP baseline scan against staging URL; example GH Action can invoke the ZAP docker image and report results.

Penetration steps (manual)
1. Run an authenticated crawl and ZAP scan against staging (with low risk credentials).
2. Validate SQL injection, auth bypasses, excessive permissions, and data leakage.
3. Check CSP violations, cookie flags, and HSTS via browser security tools.

Quick commands
```bash
# Run migration via psql
DATABASE_URL="postgres://user:pass@host:5432/dbname" bash deploy/arty-housekeeping/deploy/scripts/run_migration.sh

# Local compose to test flows
cd deploy/arty-housekeeping
docker compose up --build
```

If you want, I will:
- Run the migration for you (you must provide `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` in a secure manner).
- Create Sentry projects and wire DSNs into the repo secrets (you supply DSNs or I can guide you).
- Create GitHub Actions to run OWASP ZAP against a staging URL and fail on high-risk findings.
