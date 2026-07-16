# Connect-T Reliability and Security Audit

## Scope

This pass reviewed the production Node backend, Expo mobile app, web build, Android workflows, and repository security surfaces. It intentionally preserved the existing screen structure, styles, colors, and navigation design.

At the time of review, the repository had no open pull requests and no open issues to triage. The work therefore focused on defects found by source inspection and clean-build verification.

## High-impact defects fixed

- Replaced the hardcoded/demo OTP path with cryptographically generated six-digit OTPs, server-issued sessions, expiry, attempt limits, resend throttling, and short-lived verification proofs.
- Bound registration and login to the verified mobile number and purpose. Civic, Nagarsevak, Super Admin, seeker, and employer sessions now receive signed, scoped tokens.
- Removed public role escalation and account-token issuance. User updates verify OTP/account ownership, prevent cross-account mobile takeover, preserve server-owned roles, and enforce the one-time ward-change rule.
- Added server-side authorization for complaints, officers, Super Admin access IDs, alerts, feed posts, likes, blocks, chat, jobs, applications, job messages, profiles, resumes, and notifications.
- Made Super Admin revocation effective immediately by downgrading the backing account and validating current database state on privileged requests.
- Added the missing officer-delete and direct job-message-delete routes used by the mobile app.
- Persisted selected photos/videos through validated server uploads instead of storing device-local URIs that other devices cannot open. Uploads are type checked and limited to 8 MB.
- Fixed stale cross-session GET caching and invalid persisted sessions in the mobile API layer.
- Removed committed hardcoded legacy admin credentials.
- Removed repeated complaint IDs caused by a non-idempotent install patch. Dependency installation no longer rewrites tracked app source.

## Build and workflow fixes

- Added pull-request quality checks for backend tests/syntax, mobile TypeScript, and web typecheck/build.
- Changed Android GitHub Actions and Codemagic installs to deterministic `npm ci` runs.
- Aligned Expo SDK 56 packages with the patch versions required by Expo Doctor.
- Unified backend startup through `backend/hostinger-entry.js` for npm, PM2, Render, and managed-host entry points.
- Aligned the production API URL configuration and added environment templates.
- Updated the Hostinger schema with required profile, ward, and message columns.

## Verification completed

- Backend syntax checks: passed.
- Backend authentication/OTP tests: 4 passed.
- Backend production dependency audit: 0 vulnerabilities.
- Mobile TypeScript: passed.
- Expo Doctor: 21/21 checks passed from a clean install.
- Android Expo production export: passed (1,958 modules, Hermes bundle generated).
- Web TypeScript and Vite production build: passed.
- Backend startup/preloader smoke test: passed; all production patches loaded before the server.
- pnpm frozen-lock validation: passed.

## Deployment notes

1. Configure every value documented in `.env.example`; use a stable random `JWT_SECRET` in production.
2. Apply `backend/schema-hostinger.sql` to the target database before deploying the backend.
3. Set `EXPO_PUBLIC_API_URL` to the public backend origin in GitHub/Codemagic.
4. Run the Android native workflow to produce the signed APK/AAB against the real database and SMS provider.

The mobile audit still reports a moderate advisory in Expo's transitive `xcode -> uuid` build-tool chain. npm offers only a forced downgrade to an incompatible Expo Splash Screen release, so that breaking change was not applied. It is not used by the Android app runtime and should be rechecked when Expo publishes a compatible dependency update.
