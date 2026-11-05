# IGES administration dashboard

Open `/admin` (or `/admin/login`) on the existing frontend. The customer footer also links to Hotel administration. This is a live API dashboard; reference screenshots and sample reservations are not embedded in the application. The forest green navigation, ivory workspace, gold actions, serif headings, tables, cards and editors follow `output/design/admin-dashboard-v2`.

## Start with the real API

1. Start the configured SQL Server database. The existing connection setting is `ConnectionStrings__NoName_HotelDbConnectionString`.
2. Configure the JWT key through user secrets or `JwtSettings__key`, as described in the backend guide.
3. From `NoName_Hotel.sol`, apply migrations:

   ```powershell
   dotnet ef database update --project NoName_Hotel.Infrastructure --startup-project NoName_Hotel.api
   ```

   `20261103092932_AdministrationWorkspace` adds actual arrival/departure timestamps, per-room guest counts, branch website settings, website enquiries and reply records. It preserves existing reservations and does not infer historical check-ins. Earlier pending room-layout migrations still enforce their inventory review rules.

4. Use an existing system administrator, or register a staff account normally and grant it system access through the explicit local operator command:

   ```powershell
   dotnet run --project NoName_Hotel.api --no-launch-profile -- --grant-system-admin staff@example.com
   ```

   Replace the email with the intended existing account. This command exits after granting access; it does not start the web server, create accounts, assign default passwords or expose a public grant endpoint. Public registration only creates guest accounts.

5. Start the backend, then the frontend:

   ```powershell
   # NoName_Hotel.sol
   dotnet run --project NoName_Hotel.api --launch-profile http
   # Separate terminal, Frontend
   npm run dev
   ```

6. Open `http://127.0.0.1:5173/admin/login`. Development API requests use the existing Vite proxy (`http://localhost:5183` by default). Production needs the documented `/api/`, `/uploads/` reverse proxy and SPA fallback.

The configured LocalDB instance failed to start during implementation, so no migrations or data changes were made to the user's configured database. Automated integration checks use disposable in-memory SQLite. Start or repair LocalDB, or supply a working SQL Server connection, before applying migrations and signing in with real hotel data.

## Implemented workflows

| Screen | Live functionality |
| --- | --- |
| Overview | Branch-local daily arrivals/departures, pending reservations, physical available rooms, seven-day arrivals/check-ins, missing-photo and maintenance links |
| Rooms & pricing | All/draft/published/maintenance filters, search, category/floor filters, pagination, create/edit descriptions, numbering, beds, guests, size, amenities, rate, publication, operational state, honeymoon designation |
| Room editor | Server validation, numbering-derived category/floor, twin and honeymoon rules, bedroom/bathroom photo requirements, reserved-room protections |
| Image library | Room/type filters, pagination, multipart JPEG/PNG/WebP uploads, captions, photo-type updates, confirmed deletion, publication protections, links to hero/facility images |
| Bookings | Search guest/email/reference/room, stay date and status filters, arrivals filter, pagination, filtered CSV export, authoritative totals, quoted per-room rates, guest identity, confirm/cancel |
| Guests | Recorded in-house stays only, actual check-in, expected checkout in branch time zone, room guest counts, overdue badges, search/floor/date filters, linked booking, checkout |
| Messages & emails | Website enquiry inbox, unread/archive state, search, conversation details, replies through configured SMTP, persisted reply status and duplicate-request protection |
| Branches | Create/update/delete with backend relationship/capacity restrictions, country, location, rating, currency, time zone, legacy rate, operational inventory count |
| Countries | Create/edit/delete country catalogue; full updates cover the existing country patch functionality |
| Facilities | Meal/pool/activity/bar/lounge filters, publication filter, search, pagination, create/edit/delete offerings, opening hours, optional price and image upload |
| Website settings | Display name, hero image upload/URL, published contact details, draft/published privacy and booking policies, expected checkout time |
| Administrators | View branch assignments; system administrators assign registered accounts by email and revoke branch access |
| My account | Profile name update, current-password verified password change, session sign-out, access scope |

Administrative access is checked with `/api/v1/admin/me`, then enforced by the existing backend branch authorization filter for every operation. A branch assignment does not grant the global Administrator role. Revoking it blocks later requests even when the user's token remains otherwise valid. Admin sessions use the existing per-tab bearer token storage. New login tokens include an Identity security stamp; password changes revoke those existing sessions. Previously issued tokens without a stamp remain valid until expiry for compatibility.

The customer site reads published settings for the selected branch. Hero images are used on Home, Rooms and Booking; contact details and policies are used on their public pages. The new customer contact form delivers enquiries into the branch inbox. Policy text is rendered as text, never injected HTML. Room and facility publication remains controlled by the existing catalogue endpoints. Physical room removal is represented by unpublishing/maintenance because the backend has no room delete endpoint.

## Email delivery

Website messages work without an email service. To enable outgoing replies, configure these server-side settings through environment variables or user secrets:

| Setting | Meaning |
| --- | --- |
| `HotelMail__Host` | SMTP host |
| `HotelMail__Port` | SMTP port, default 587 |
| `HotelMail__EnableSsl` | STARTTLS, default true |
| `HotelMail__From` | Verified sender email |
| `HotelMail__Username` | SMTP username when authentication is required |
| `HotelMail__Password` | SMTP password; never put it in `VITE_` variables |

The published email setting is a public contact/reply-to address, not an SMTP credential. Without mail configuration the reply button is disabled and the API refuses delivery. Replies reserve a unique request ID before SMTP is called; repeats cannot send twice. `Sent` means SMTP accepted the message, not that the recipient opened it. A failed or interrupted send is recorded as `Delivery uncertain`; do not blindly resend. Incoming mailbox ingestion requires an actual mail provider integration and is explicitly shown as disconnected. No external email was sent during verification; SMTP tests use a test sender.

Payments, refunds, password recovery, email-address changes and historical event auditing remain outside the supplied backend contract. The UI does not invent those records or claim those actions succeeded. Legacy bookings must acquire physical room assignments through the existing booking owner update flow before staff can check them in.

## Verification

```powershell
npm run build
npm test
npm run test:e2e
dotnet test ..\NoName_Hotel.sol\NoName_Hotel.Tests\NoName_Hotel.Tests.csproj
```

For actual-controller browser integration, start `dotnet run --project tests/ApiHarness/ApiHarness.csproj`, then set `IGES_REAL_BACKEND_TESTS=1` and run the browser suite. The harness serializes requests because its disposable SQLite database shares one connection. It is never used by the production app. Dashboard screenshots in `verification/admin-*.png` use explicitly intercepted illustrative fixtures. See `verification/ADMIN-REPORT.md` for results and remaining environment requirements.
