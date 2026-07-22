# Connect-T Backend Deployment

This package must be deployed as a complete folder. Do not upload only
`server.js`: production routes for OTP, Job Portal sessions and messages, and
ward utility status are loaded from the companion modules in this package.

## Before replacing files

1. Back up the current backend folder and database.
2. Preserve the live `.env` file. Never replace it with `.env.example`.
3. Preserve the live `uploads` folder, or configure `UPLOAD_DIR` to its existing
   persistent absolute path.

## Deploy

1. Stop the current Node.js application in Hostinger.
2. Replace the application code with all files and folders from this package.
3. Keep the preserved `.env` and `uploads` directory in place.
4. Run `npm ci --omit=dev` in the backend directory.
5. Set the startup file to `server.js`. `hostinger-entry.js` is also supported,
   but only one startup file should be configured.
6. Restart the Node.js application.

## Required production configuration

- Set a long, stable `JWT_SECRET`. Changing it logs out all current users.
- Set a separate long `ADMIN_API_KEY`.
- Confirm the `DB_*`, `PUBLIC_BASE_URL`, `ALLOWED_ORIGINS`, and SMS provider
  values. Use `.env.example` only as a field reference.
- Confirm the uploads directory is writable and persistent across restarts.

## Verify after restart

1. Open `/api/server-info`. It must report
   `backend-server-production-ready-v4` and all feature flags as `true`.
2. Open `/api/healthz`. It must return `{"status":"ok"}`.
3. Open `/api/health`. It must return a successful MySQL check.
4. A request to `POST /api/job-portal/session` without a token should return a
   friendly `401` response, not `404` or `API route not found`.
5. Send and verify an OTP from the unified mobile login using a real test
   number, then confirm citizen, approved Nagarsevak, and Super Admin accounts
   are routed to their correct dashboards.

If `/api/server-info` shows an older version, Hostinger is still running the old
folder, old process, or a different startup path. Stop it, confirm the configured
application root, replace the complete package, and restart again.
