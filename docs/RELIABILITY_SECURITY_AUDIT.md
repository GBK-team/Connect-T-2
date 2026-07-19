# Connect-T Production Reliability and Security Re-audit

**Re-audit date:** 19 July 2026
**Scope:** Expo mobile app, Node/Express backend, MySQL schema paths, web build, Android configuration, CI, authentication, authorization, uploads, validation, and error handling.

This pass preserved the existing screen layouts, styles, colors, and navigation. It focused on workflow correctness, security, reliability, data integrity, and production build safety.

## High-impact defects fixed

- Replaced insecure/random identifier generation in security-sensitive flows with cryptographic randomness.
- Kept OTP registration and login bound to the verified mobile number and purpose, with signed scoped sessions, expiry, attempt limits, and resend throttling.
- Enforced current database roles for protected requests so stale or modified tokens cannot grant Super Admin, Nagarsevak, or Job Portal privileges.
- Enforced Ward 1 through Ward 29 across civic, Nagarsevak, utility, and migration code and made the legacy A/B ward normalization a one-time migration.
- Added database indexes for common user and complaint filters.
- Made complaint creation plus its initial timeline event atomic, and made status update plus timeline creation atomic.
- Added strict GPS pair/range/accuracy validation, ISO date validation, full-name validation, office-contact validation, complaint length limits, and Job Portal profile/message validation.
- Prevented a second approved Nagarsevak from being assigned to the same ward and made officer removal atomically unassign complaints.
- Restricted complaint, profile, feed, and chat uploads to supported image types; verified file signatures; enforced the 8 MB limit; and made the uploader honor `UPLOAD_DIR`.
- Removed the stale 20-second mobile GET response cache so pull-to-refresh always requests current data while retaining duplicate in-flight request protection.
- Recovered safely from corrupt persisted civic and Job Portal sessions and stopped sending expired tokens.
- Replaced raw API, SQL, URL, stack, HTML, and 5xx messages with user-safe errors and traceable request IDs. Malformed and oversized JSON bodies now return safe JSON responses.
- Added security headers, disabled framework disclosure and mobile token backup, disabled Android cleartext traffic, removed unnecessary Android permissions, and removed the stale deep-link scheme.
- Added configurable browser CORS origins while preserving native-app requests.
- Clarified that the native GitHub APK is an internal-test artifact. Play releases use the EAS production AAB workflow and protected signing credentials.

## Automated regression coverage

Backend tests now cover:

- Signed-token validation and tamper rejection.
- OTP mobile/purpose binding, expiry behavior, one-time use, and resend throttling.
- Safe 5xx payloads and request-ID header sanitization.
- GPS coordinate and ISO date validation.
- Uploaded file signature validation.

CI now gates pull requests with:

- Backend syntax checks, tests, and production dependency audit.
- Expo Doctor, mobile TypeScript, Android export, and production dependency audit.
- Web TypeScript, production build, and production dependency audit.

## Verification completed

- Backend syntax checks: passed.
- Backend tests: 10 passed.
- Backend production dependency audit: 0 vulnerabilities.
- Mobile TypeScript: passed.
- Expo Doctor: 21/21 checks passed.
- Mobile production dependency audit: 0 vulnerabilities.
- Android Expo export: passed.
- Web TypeScript and Vite production build: passed.
- Web production dependency audit: 0 vulnerabilities.
- Git diff whitespace validation: passed.

## Production configuration still required

Code-level checks cannot replace validation against the real production services. Before public release:

1. Set every value in `.env.example`, especially stable independent `JWT_SECRET` and `ADMIN_API_KEY` values, `PUBLIC_BASE_URL`, `ALLOWED_ORIGINS`, and the real database/SMS credentials.
2. Mount `UPLOAD_DIR` on persistent storage or replace local uploads with managed object storage.
3. Run the database schema/migration path against a production backup first.
4. Verify OTP delivery and approved DLT/SMS templates with the real provider.
5. Run citizen, Nagarsevak, Super Admin, seeker, and employer end-to-end tests against a staging database.
6. Build the Play Store AAB through the EAS production profile and verify protected Android signing credentials.
7. Configure a real push-notification provider if background device notifications are required. The current product provides in-app alert/notification records but does not include an APNs/FCM delivery service.

No repository-only audit can honestly guarantee that external database, SMS, storage, signing, or store-console configuration is correct; those checks must be completed in staging and the relevant provider dashboards.
