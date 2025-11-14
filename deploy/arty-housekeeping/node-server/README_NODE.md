# ARTY Housekeeping — Node.js/Express Scaffold

This lightweight scaffold mirrors the Python demo server and is intended as the starting point for migrating to the recommended stack (Node.js + Express).

Quick start (PowerShell):

```powershell
cd deploy\arty-housekeeping\node-server
npm install
npm start
```

Server defaults to port `3001` (use `PORT` env to override).

Endpoints:
- `GET /health` — health status
- `GET /api/rooms` `GET /api/tasks` `GET /api/staff` `GET /api/inventory` — CSV-backed APIs
- `POST /webhooks/{vendor}` — webhook receiver; uses mapping files in `../integrations/{vendor}_adapter.json` and writes processed JSON to `../data/processed/`

Security notes (development -> production)
- Use environment variables or AWS Secrets Manager for DB credentials; never commit secrets to the repo. `.env.example` shows keys but not values.
- The server includes `helmet` for safe headers and a basic rate limiter by default. Tune `express-rate-limit` for your traffic profile.
- Validate `vendor` and other incoming parameters; the preview endpoint rejects suspicious vendor names.
- Logs redact raw payloads; store sensitive event data only where access controls exist (RDS with restricted network access).
- For production, front APIs with authentication (JWT or API keys), enable HTTPS, and run the server inside a VPC with RDS Proxy if using AWS.


Next steps to complete migration:
- Add auth and role controls
- Add preview API for mapping dry-run
- Add normalization rules and validation
- Add Next.js frontend and connect to these APIs
