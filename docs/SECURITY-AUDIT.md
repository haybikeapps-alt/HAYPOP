# HAYPOP Security & Authentication Audit

Date: 2026-10-02

## Current architecture

HAYPOP uses Supabase Auth + PostgreSQL + Row Level Security (RLS). The browser is untrusted input.

- Supabase Auth is authoritative for authentication/session state.
- `public.profiles` is authoritative for role and active status.
- PostgreSQL RLS is authoritative for data access.
- Checkout uses a `security definer` RPC with row locks for atomic stock movement.
- LocalStorage is a cache/offline queue only; it is never an authorization source.
- No Supabase service-role key is used in the frontend.

## Authorization matrix

| Area | Unauthenticated | Kasir | Admin |
|---|---:|---:|---:|
| Auth login/logout | Allowed | Allowed | Allowed |
| Products read | Denied | Allowed | Allowed |
| Products write/delete | Denied | Denied | Allowed |
| Profiles read | Own | Own | All |
| Profiles write | Denied | Denied | Allowed with database safeguards |
| Transactions read | Denied | Own | All |
| Transactions create | Denied | Own via atomic RPC | Own via atomic RPC |
| Expenses | Denied | Denied | Allowed |
| Store settings read | Denied | Allowed | Allowed |
| Store/payment settings write | Denied | Denied | Allowed |
| Audit logs read | Denied | Denied | Allowed |

## Security fixes in this branch

1. New Auth users are always provisioned as `kasir`; client-supplied `role=admin` metadata is ignored.
2. Profile updates are protected by a database trigger.
3. A user cannot change their own role/active status through the profile API.
4. The last active admin cannot be demoted or deactivated.
5. Role/status changes are written to `audit_logs`.
6. Checkout derives the cashier name from the authenticated profile rather than trusting the browser value.
7. Checkout validates item quantities, line totals, discount, tax, total, payment amount, change, and payment method.
8. Checkout rejects unavailable products and performs stock decrement atomically.
9. Direct client transaction inserts remain disabled.
10. Admin user management now reads and writes real Supabase profiles; it no longer creates fake LocalStorage users or stores PINs.
11. The application refreshes products/settings from Supabase after authentication, with LocalStorage used only as a temporary cache.

## User provisioning

The frontend intentionally does **not** create Auth users or passwords. Creating an Auth user requires a trusted server-side operation such as the Supabase Dashboard or a deployed Edge Function using a service-role credential.

The current HAYPOP user-management screen therefore manages existing Auth profiles only. It must never be changed to expose the service-role credential to the browser.

## Remaining work

- Add a secure Edge Function for admin-created Auth users if in-app user creation is required.
- Add integration tests against Supabase for RLS, profile safeguards, and the atomic checkout RPC.
- Add structured audit events for more financial/configuration operations.
- Model modifier/topping stock as explicit inventory movements rather than relying only on the parent product quantity.
- Add a proper transaction/refund/restock lifecycle.
- Add production deployment controls such as TLS/HSTS verification and secret-management checks.

## Design principle

The client is treated as untrusted input. Authentication, role, ownership, stock movement, and sensitive authorization decisions are enforced by Supabase Auth and PostgreSQL.
