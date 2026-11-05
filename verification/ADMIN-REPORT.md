# Administration dashboard verification — 3 November 2026

The implementation follows all fourteen images in `output/design/admin-dashboard-v2`. It uses real React components and API calls; none of the design images are embedded as application screens.

## Executed checks

- Production frontend build: passed (TypeScript and Vite).
- Frontend core tests: 14 passed.
- Backend regression suite: 60 passed, zero skipped. Includes existing booking/catalogue rules plus admin access, assignment/revocation, branch isolation, exact room guest allocation, spare rooms, check-in/out, duplicate transitions, overdue-room protection, public policy privacy, enquiry privacy, SMTP request deduplication, profile changes and password-session revocation.
- Complete browser suite with `IGES_REAL_BACKEND_TESTS=1`: 21 passed, zero skipped. Both actual-controller integration tests ran against disposable SQLite. The customer registration/reservation/edit/cancel flow passed alongside the new staff dashboard flow.
- The actual-controller dashboard flow confirmed a reservation, recorded check-in, inspected the in-house guest list, recorded checkout, changed a room rate, published contact details, received a website enquiry and marked it as read.
- Responsive visual checks captured all fourteen dashboard destinations/editors at 1440px and the overview at 390px. The mobile overview fits the viewport; wide tables scroll within their own containers. Navigation opens and closes on mobile. No browser runtime errors were observed.

The browser suite initially exposed an isolated harness limitation: its single in-memory SQLite connection could not serve parallel requests. The harness now serializes forwarded HTTP requests. Production SQL Server retains its normal connection pool. Mobile overflow from an absolutely positioned hidden table heading was also fixed by making table scroll containers positioned ancestors.

## Screenshots

`admin-overview.png`, `admin-rooms.png`, `admin-room-editor.png`, `admin-images.png`, `admin-bookings.png`, `admin-booking-details.png`, `admin-guests.png`, `admin-branches.png`, `admin-facilities.png`, `admin-facility-editor.png`, `admin-website.png`, `admin-administrators.png`, `admin-account.png`, `admin-messages.png`, `admin-mobile.png`.

These captures use explicitly intercepted illustrative data. External fixture photo URLs are deliberately blocked, exercising the photograph fallback. Live screens display actual uploaded room/facility/hero photographs from the backend.

## Environment requirements

The configured `(localdb)\MSSQLLocalDB` instance could not start, including an explicit non-destructive start attempt. SQL Server reported: `Error occurred during LocalDB instance startup: SQL Server process failed to start.` Database migration status could therefore not be read. No migrations were applied to the configured hotel database and no real hotel records were altered. Restore a working SQL Server connection, apply the supplied migrations, then use an authorized account to open `/admin`.

Outgoing reply delivery needs server-side SMTP configuration. Incoming mailbox ingestion is not connected and the dashboard says so. No real email was sent; SMTP regression tests use an in-process test sender. Website enquiries and inbox state work without SMTP. Payments/refunds and password recovery remain outside the supplied API contract.

See `../ADMIN.md` for startup commands, the explicit administrator provisioning command, route/functionality mapping and mail settings.
