# IGES Hotel & Suites — customer website and administration

React 19, TypeScript, Vite 7, plain CSS and a small Tailwind CSS layer. The supplied mockups guide the layouts; no mockup screenshots are embedded as pages. The administration dashboard is at `/admin`; see [ADMIN.md](ADMIN.md) for its functionality, database migration, administrator setup and mail configuration. The backend now also supports recorded guest stays, branch website settings, branch access management, staff account updates and website enquiries.

## Run locally

Node 22.12+ and npm are required.

For local development with the backend, keep the frontend checkout in `Frontend` and the backend checkout in `NoName_Hotel.sol` under the same parent folder. The backend launch command and API test harness use this layout.

From the `Frontend` folder:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:5173/` for the **live API experience**. Set up and start the existing backend according to `../NoName_Hotel.sol/docs/IGES.md`, including SQL Server, migrations and the JWT signing key. The default development proxy targets `http://localhost:5183`. The backend's `http` launch profile can be started with:

```powershell
dotnet run --project ..\NoName_Hotel.sol\NoName_Hotel.api --launch-profile http
```

If your backend redirects HTTP to HTTPS, configure `API_PROXY_TARGET` with its trusted HTTPS URL and make its development certificate trusted by Node. TLS verification is deliberately enabled. No backend CORS changes are needed when using the proxy.

For the clearly labelled **development design preview**, open `http://127.0.0.1:5173/?demo=1`. This has illustrative photographs, rooms, rates and menus. It never falls back from an API error, creates accounts, makes reservations or processes payments. Its stay draft is separate from the live draft, and real sign-in tokens are not read in preview mode. Production builds replace the entire demo module with an empty module; sample images/data are excluded.

## Configuration

See `.env.example`. `VITE_` variables are public, compiled into the browser bundle; never put secrets there.

| Variable                | Meaning                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`          | API origin without `/api/v1`; empty means same-origin proxy (recommended).                        |
| `API_PROXY_TARGET`      | Development-only backend proxy target.                                                            |
| `VITE_HOTEL_PHONE`      | Hotel-verified management phone. Empty hides the call action.                                     |
| `VITE_HOTEL_EMAIL`      | Hotel-verified management email. Empty hides the email action.                                    |
| `VITE_HOTEL_HERO_IMAGE` | Approved actual hotel photograph URL; otherwise an available backend room photo is used.          |
| `VITE_PRIVACY_POLICY`   | Reviewed public privacy text. Empty shows pending-publication information.                        |
| `VITE_BOOKING_POLICY`   | Reviewed public terms and booking/cancellation text. Empty shows pending-publication information. |

Published branch contact details, hero image and policies now come from the backend website settings endpoint. The environment values remain a fallback for older servers. The contact form submits website enquiries to the branch inbox.

## Pages and integrations

Home; Rooms; reusable category details with bedroom/bathroom gallery and physical room inspection; multi-room availability, account entry and final review; Register; Login; Kitchen; server-backed booking result with printing/Save PDF; My Bookings; owner booking details/edit/cancel; management contact; policies; 404/403/500/503/maintenance/offline; honest recovery and verification information.

| Feature                    | Current backend contract                                               |
| -------------------------- | ---------------------------------------------------------------------- |
| Profile/categories         | `GET /api/v1/hotel`                                                    |
| Branches/details           | `GET /api/v1/branches`, `GET /api/v1/branches/{id}`                    |
| Room search/inspection     | `GET /api/v1/branches/{id}/rooms[/{roomId}]`                           |
| Hospitality discovery      | `GET /api/v1/branches/{id}/offerings`                                  |
| Guest accounts             | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`                |
| Owner bookings             | `GET/POST /api/v1/branches/{id}/bookings`                              |
| Owner editing/cancellation | `PUT .../bookings/{bookingId}`, `POST .../bookings/{bookingId}/cancel` |

All paginated lists follow `data` and `metadata.hasNext`, page size 50. Dated room requests always send `checkIn` and `checkOut`. Standard maps to `Normal&isTwinRoom=false`, Twin to `Normal&isTwinRoom=true`, VIP to `Vip`, VVIP to `Vvip`. Only `isHoneymoonSuite=true` rooms get the physical-room honeymoon label. Platinum is excluded from every online selection, inspection list and submission and appears only as an enquiry banner.

The availability page searches with per-room `guests=1` to let a guest combine room capacities, then validates aggregate capacity. Category browsing uses the requested per-room occupancy. Rooms are reloaded on search changes and inspected again before submission. Creation sends matching `hotelId`, distinct `roomIds`, `rooms`, dates and guest count. The backend calculates the authoritative total and status. Pending is never described as Confirmed. No payment status is inferred.

## Authentication and booking safety

The access token lasts up to ten minutes and lives in per-tab sessionStorage. The frontend renews it during interaction and before authenticated requests need a fresh token. The API rotates a refresh token stored in a Secure, HTTP-only, SameSite=Strict cookie. Use the same-origin API proxy (leave `VITE_API_URL` empty), with HTTPS in production. The API ends sessions after six hours of inactivity or 24 hours from sign-in. Signing out revokes the session, and password changes invalidate existing sessions through the Identity security stamp. Apply the `BrowserSessionRenewal` database migration and sign in again to start a renewable session.

Only non-sensitive stay fields (branch, dates, guests, category and room IDs) are saved as a draft. Passwords are not persisted. Private booking data is fetched afresh from owner-only endpoints and components remount on identity changes. Session expiry preserves the draft.

Submission is locked synchronously to avoid double clicks. Before creation, a baseline owner list is captured. An uncertain network/5xx outcome is recorded per user in session storage, then reconciled with new matching owner reservations. There is no mutation retry. If inconclusive, creation stays blocked while the guest rechecks their account or contacts management. Clearing an uncertain attempt requires an explicit acknowledgement that management confirmed no booking was created. The backend does not support idempotency keys or request-status lookup, so uncertainty cannot always be resolved automatically.

The owner editor supports keeping **all original room IDs** (retaining quoted rates) or replacing **all rooms**. Partial retained/new mixtures are intentionally not offered: the DTO exposes no per-room quoted rates or pre-update quote. The original total divided by original nights estimates a retained-room edit; new-room rates estimate a full replacement. The server rechecks and returns the final total. Current reserved rooms cannot be fetched from public availability, so retained-room capacity/overlap is revalidated by the update endpoint. Legacy reservations without assigned rooms must select replacements. Unsaved edits prompt before navigation; cancellation explains the actual room release without inventing refund rules.

## Build, checks and deployment

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run preview
```

Browser checks use installed Microsoft Edge in headless mode. If Edge is unavailable, install a Playwright Chromium browser and adjust `channel` in `playwright.config.ts`. `tests/e2e/flows.spec.ts` uses explicit intercepted fixtures to exercise errors and conflicts. The separately opt-in real-backend test uses the supplied controller/service code and an isolated in-memory SQLite database:

```powershell
# Terminal 1: requires the backend's .NET 9 SDK and restored packages
dotnet run --project tests/ApiHarness/ApiHarness.csproj
# Terminal 2: Vite running on 5173, then:
$env:IGES_REAL_BACKEND_TESTS='1'
npm run test:e2e -- tests/e2e/backend.spec.ts
```

The harness never touches configured SQL Server or real hotel data. Stop it after verification. It is test-only and must not be deployed. `tests/visual.mjs` captures labelled preview pages at 1440×1000 and 390×844 into `verification/`.

Deploy only `dist/`, with same-origin reverse proxy routes for `/api/` and `/uploads/`, and an SPA fallback for all frontend routes. An Nginx example is in `deployment/nginx.conf.example`; adapt its host/upstream/certificates to your deployment. Vite's development proxy is not part of a production build. Do not rewrite API errors to `index.html`. The backend currently has no CORS policy; direct cross-origin deployment requires an explicit backend configuration change. Sensitive page metadata uses `noindex,nofollow`; authenticated API responses should not be cached.

## Before hotel launch

Supply the real branch inventory, prices, bedroom/bathroom photographs, menus and verified contact details through the appropriate backend administration/configuration. Provide approved privacy, cancellation, no-show, refund and check-in/out policies. Confirm actual breakfast inclusions; the current room DTO has none. No binding policy or free-breakfast claim is invented.

Password reset, reset-success, email verification/resend and expired-link URLs provide honest support information. Implement public request-reset/reset/verify/resend endpoints, Identity token validation and a configured email delivery service before enabling those actions. `AddIdentityApiEndpoints` alone does not expose these flows: the backend does not call `MapIdentityApi` and only its register/login controllers are available. No mandatory verification is imposed.

The booking DTO exposes room IDs but not room numbers/room snapshots; receipts therefore show the actual server room IDs. It also exposes no payment status. Full SQL Server migration/concurrency and real hotel delivery/asset validation remain deployment checks.

See `verification/REPORT.md` for executed checks and `ASSETS.md` for preview-image provenance.
