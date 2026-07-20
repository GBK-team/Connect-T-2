# Unified role authorization rollout

The migration is additive and idempotent. It does not delete citizens,
complaints, existing users, or the legacy `super_admin_access_codes` table.

## Before deployment

1. Back up the production database, especially `users`, `complaints`, and
   `super_admin_access_codes`.
2. Set a strong persistent `JWT_SECRET`.
3. Set `MAIN_SUPER_ADMIN_MOBILE` to the normalized 10 digit mobile number that
   must be protected as the primary Super Admin. A clean database does not use
   a hardcoded fallback number.
4. Confirm the SMS provider environment variables and send one staging OTP.

## Automatic migration

On startup the backend creates:

- `role_assignments`
- `role_audit_logs`
- `role_migration_runs`

It then performs one transaction identified by
`unified_role_authorization_v1`:

- migrates current `users` roles without changing user or complaint IDs;
- converts legacy active access-code owners to phone authorization records;
- imports all 65 official Nagarsevak PDF rows;
- validates missing values, ten-digit mobile numbers, and duplicates;
- protects the configured root administrator, or the earliest existing active
  Super Admin when upgrading an established database;
- records the import summary for `/api/super-admin/role-import-summary`.

Official A/B/C designations are retained in `ward_or_designation`. The existing
complaint workflow continues to use the numeric ward extracted from that
designation.

## Rollback

If staging verification fails:

1. Stop the new backend version.
2. Restore the application version deployed immediately before this migration.
3. Keep the additive role tables in place or restore the pre-deployment backup.
   The previous application can ignore these tables.
4. Do not drop the legacy access-code table during the observation period. It
   is retained for rollback/history but is not used by the new login routes.

## Required staging checks

- OTP send, resend timer, invalid OTP, expired OTP, and throttling.
- New citizen profile completion and repeat citizen login.
- First login for one imported Nagarsevak and correct official name/designation.
- Super Admin login using only the authorized mobile number and OTP.
- Role priority when a test mobile has multiple active assignments.
- Deactivation invalidates an existing privileged session.
- Primary, self, and last-active-admin protections.
- Add, activate, deactivate, remove, search, last-login, and audit-log UI.
- Complaint creation/history and Job Portal switching for an existing citizen.

Do not remove the rollback tables or claim production completion until these
checks pass against the real SMS provider and a production-like database.
