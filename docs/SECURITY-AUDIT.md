# HAYPOP Backend Security & Authentication Audit

Date: 2026-10-02

## Executive summary

The initial backend had no server-side authentication or authorization. The browser-selected user, role, and PIN were treated as trusted input, while REST endpoints were directly writable.

This branch establishes the security foundation:

- Server-side username + PIN authentication.
- PIN hashing with scrypt and per-user salt.
- Server-side sessions stored in SQLite.
- HttpOnly + SameSite=Strict session cookie; Secure in production.
- Login throttling per IP + username.
- Server-side role enforcement for admin operations.
- Cashier transaction ownership enforced by the server.
- User API never returns PINs or PIN hashes.
- Legacy plaintext PINs are migrated on first authentication.
- Hardcoded default PINs removed from the source; production bootstrap PINs are environment-controlled.
- API security headers and no-store caching for API responses.
- Generic 500 responses instead of exposing database error details.
- CI typecheck + production build.

## Authorization matrix

| Area | Unauthenticated | Kasir | Admin |
|---|---:|---:|---:|
| Auth login/logout | Allowed | Allowed | Allowed |
| Database status | Denied | Denied | Allowed |
| Products read | Denied | Allowed | Allowed |
| Products write/delete | Denied | Denied | Allowed |
| Users read/write/delete | Denied | Denied | Allowed |
| Transactions read | Denied | Own transactions | All transactions |
| Transactions create | Denied | Own server identity | Own server identity |
| Offline sync | Denied | Own transactions only | Allowed |
| Expenses | Denied | Denied | Allowed |
| Store settings read | Denied | Allowed | Allowed |
| Store settings write | Denied | Denied | Allowed |
| Payment settings | Denied | Denied | Allowed |
| Database backup | Denied | Denied | Allowed |

## Remaining security work

1. Add comprehensive server-side schema validation for every endpoint.
2. Make transaction writes fully atomic with stock updates and enforce business invariants.
3. Add automated authentication/authorization integration tests.
4. Add audit-log records for login failures, role changes, user deletion, payment-setting changes, and financial operations.
5. Add explicit session revocation UI and idle timeout handling.
6. Add CSRF defense if the deployment ever permits cross-site cookie contexts; SameSite=Strict is currently the primary browser defense.
7. Move sensitive payment/account data out of general settings storage where practical.
8. Add production TLS/HSTS deployment verification and secret-management checks.
9. Review offline data architecture: localStorage remains a cache and can be modified by a user with local browser access; it must never become an authorization source.

## Design principle

The client is treated as untrusted input. The server session and database state are authoritative for identity, role, ownership, and sensitive operations.
