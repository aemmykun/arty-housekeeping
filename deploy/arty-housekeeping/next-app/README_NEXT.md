# ARTY Next.js Mapping Editor (Minimal)

This minimal Next.js app provides a mapping preview UI that sends sample payloads to the Node preview API. It proxies requests via `/api/preview` to avoid CORS issues during development.

Quick start (PowerShell):

```powershell
cd deploy\arty-housekeeping\next-app
npm install
npm run dev
```

Open: `http://localhost:3000` and use the form to preview mappings.

Notes:
- The app proxies preview requests to `http://localhost:3001/api/adapters/{vendor}/preview`. Ensure the Node server is running on port 3001.
- This scaffold is intentionally minimal — for production, integrate authentication, validation, and UI improvements.
