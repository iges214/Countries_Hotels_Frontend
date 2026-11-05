# Verification and handoff — 2 November 2026

## Delivered

Complete customer frontend in `NoNameHotel/Frontend`, using React, TypeScript, Vite, plain CSS and a small Tailwind layer. All eight requested core pages and supporting owner-booking, contact, policy, recovery-information and error routes are implemented. Backend source was not changed.

The layouts use warm ivory, forest green, restrained gold, serif headings, hotel photography where supplied, responsive cards and accessible native dialogs. Four regular room cards appear under Choose your space. Standard/Twin use the supported Normal category filters; designated honeymoon rooms are labelled individually. Platinum stays enquiry-only.

## Executed checks

| Check                                     | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript + Vite production build        | Passed. Final browser bundle about 407 kB / 127 kB gzip; CSS about 55 kB / 12 kB gzip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Unit/API-client tests                     | **14 passed**: category/filter mapping; Platinum exclusion; aggregate occupancy; dates/durations/calendar validity; branch time zones; fractional currency; password rules; safe returns; reconciliation matching; pagination; error details/trace IDs; 500 sanitization; 429 advice; session requirements/token lifecycle.                                                                                                                                                                                                                                              |
| Browser flow scenarios                    | **13 passed** using headless Microsoft Edge and explicit intercepted fixtures. Covers public browsing; honeymoon labels; sign-up/sign-in return; physical-room selection; single reservation submission; authoritative Pending total; room conflict; price change; uncertain-submit reconciliation; owner details/cancel; foreign IDs; editing/unsaved warning; session expiry; 403/404/500/503/offline/recovery; network/rate limits; mobile navigation/gallery/focus restoration; mobile branch-change confirmation; isolation of preview data and live tokens/drafts. |
| Real supplied-backend browser integration | **1 passed** against the supplied ASP.NET controllers/services with isolated SQLite. UI registration and login; real Pending creation and server total; second real account cannot list or cancel the owner's reservation; owner edits dates with updated total; cancellation returns Cancelled and releases the room into availability. No real hotel database was touched.                                                                                                                                                                                             |
| Existing backend regression tests         | **49 passed, 0 failed, 0 skipped** using the supplied .NET 9 test project.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Production-only browser/artifact checks   | Passed: direct nested SPA navigation; `?demo=1` cannot activate preview in production; demo catalogue/images absent from output; failed API calls have no fake-room fallback; sensitive-page robots metadata; no mobile overflow.                                                                                                                                                                                                                                                                                                                                        |
| Visual captures                           | Eight core public/account/contact views at **1440×1000** and **390×844**, plus Pending receipt desktop/mobile/print, an actual-backend cancelled reservation and production service-unavailable mobile.                                                                                                                                                                                                                                                                                                                                                                  |

The public/account reference layouts were visually inspected against the supplied mockups. The first stock Twin image was rejected after inspection because it showed one bed. It was replaced with an ImageGen illustration showing two clearly separate beds. Reference screenshots are not embedded in the implementation. Category-card specifications now come from the same lowest-priced available room represented by the starting rate.

## Screenshots

- `desktop-home.png`, `mobile-home.png`
- `desktop-rooms.png`, `mobile-rooms.png`
- `desktop-details.png`, `mobile-details.png`
- `desktop-booking.png`, `mobile-booking.png`
- `desktop-register.png`, `mobile-register.png`
- `desktop-login.png`, `mobile-login.png`
- `desktop-kitchen.png`, `mobile-kitchen.png`
- `desktop-contact.png`, `mobile-contact.png`
- `desktop-confirmation.png`, `mobile-confirmation.png`, `confirmation-print.png` — explicit visual test fixture, Pending and fractional total.
- `real-backend-cancelled.png` — actual result from the isolated supplied-backend integration.
- `production-unavailable-mobile.png` — production build with unavailable backend; no sample imagery or invented availability.

Design-preview screenshots are illustrative and clearly labelled in the UI. The temporary local servers are stopped at handoff; use `npm run dev` to reopen the site. Setup, configuration, integration contracts and deployment examples are in `../README.md`. Asset provenance and the final image-generation prompt are in `../ASSETS.md`.

## Outstanding launch dependencies and limits

- Real SQL Server deployment, migrations, contention and existing hotel data were not exercised. The live database service was not running in the supplied environment; the integration test used the real backend code with isolated SQLite. The test harness is not a deployment server.
- Hotel-verified phone/email, approved privacy and booking/cancellation/refund/no-show/check-in policies, real production photographs, branch inventory and menus must be supplied. Empty configuration shows honest pending states. No phone/email/address or binding terms were invented.
- Current room data has no breakfast-inclusion field. No complimentary-breakfast claim is made. Offering discovery has no food-ordering endpoint.
- Authentication exposes register/login only. Password reset, verification/resend and email delivery are not wired in the backend; their frontend routes explain the limitation and direct guests to management. No emails, OTPs or reset success are simulated.
- No payment API or payment-status field exists. Receipts show actual reservation status and server total, and clearly state that payment is not collected by this website.
- No idempotency/request-status endpoint exists. An unresolved reservation timeout stays blocked pending owner-list reconciliation or explicit management confirmation; there is no mutation retry.
- Owner booking responses provide room IDs but no room-number snapshots or per-room quoted rates. Receipts show server room IDs. Editing supports all retained rooms or a complete replacement; final totals are supplied by the update response. Partial mixed-rate edits and pre-update server quotations need additional backend DTO/quote support.
- Browser automation used installed Edge, not physical iOS/Safari devices. The deployment host must provide the documented SPA fallback and same-origin API/uploads proxy. No public deployment was requested or made.
