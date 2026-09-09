# BiblePlus Admin V2 - V1 Functionality Completion Plan

## Goal

Bring the BiblePlus Admin V2 application from its current login-and-dashboard-shell state to complete functional parity with the working features in BiblePlus Admin V1, while improving security, maintainability, responsiveness, accessibility, and visual quality.

The finished application must use the backend as the source of truth. Do not port V1 dummy pages, hard-coded dashboard values, local-only blog merging, duplicated role screens, or the unreliable standalone prayer-management page. Prayer and comment review belongs in Moderation.

---
# Important Project Constraints

- Keep the existing Next.js App Router, TypeScript, Tailwind CSS, React Icons, React Toastify, and installed `motion` package.
- Import animation primitives from `motion/react`; do not install a second legacy Framer Motion package.
- Preserve the existing Aeonik local-font setup and all files under `public/fonts/AeonikProTRIAL`.
- Use environment variable `NEXT_PUBLIC_API_BASE_URL` for the backend origin. Local development may use `http://localhost:5001`; deployed builds should use `https://bibleplus-backend-nhyo.onrender.com` unless the deployment environment provides another value.
- API paths in this plan begin with `/api`. Never produce `/api/api/...` when combining them with the configured origin.
- All protected backend requests must send `Authorization: Bearer <accessToken>` through one shared client/proxy layer.
- Treat the backend response as the source of truth. Do not merge records from `localStorage` into API results.
- Keep authentication state separate from feature data. Do not persist books, blogs, events, users, quizzes, notifications, or moderation queues in browser storage.
- Prioritize only verified functional V1 modules: authentication, analytics, events, blogs, books, quiz, verse of the day, users, moderation, notifications, admin management, audit logs, exports, and system configuration.
- Do not recreate V1 placeholders such as Database, Documentation, Profile, generic Settings, or the duplicate Roles screen unless a real backend contract is added later.
- Do not expose super-admin-only controls to ordinary admins. Enforce role checks in both navigation and page actions; the backend remains the final authority.
- Every data page must include loading, empty, recoverable error, and success states.
- All destructive operations must require a confirmation modal and must disable repeat submission while pending.
- Use React Toastify for mutation success/failure feedback. Use inline validation messages for field-specific errors.

---

# Design System

## Color tokens

Centralize the following values in `app/globals.css` and consume them through semantic Tailwind utilities or CSS variables:

- `--color-brand: #2563EB` - sidebar navy, active navigation, dark brand surfaces.
- `--color-primary: #2563EB` - login button before hover, primary actions, links, focus accents.
- `--color-primary-hover: #1D4ED8` - primary-button hover state.
- `--color-primary-soft: #EFF6FF` - selected rows, subtle information backgrounds.
- `--color-background: #F3F7FC` - application canvas; acceptable gray-100 equivalent.
- `--color-surface: #FFFFFF` - cards, tables, modals, drawers, and form surfaces.
- `--color-border: #E5E7EB`, `--color-muted: #6B7280`, `--color-text: #111827`.
- Success, warning, and danger colors are semantic status colors only, never decorative branding.

Add a complete `.dark` token set rather than scattering `dark:` values through every component. The dark theme should retain blue accents, readable contrast, subdued borders, and near-black/navy surfaces.

## Visual language

- Use clean standard admin-dashboard composition: clear page title, short supporting copy, primary action, filters, summary cards, and a data surface.
- Prefer white or gray-100 surfaces, thin borders, and `rounded-2xl` containers. Use `rounded-xl` controls and `rounded-3xl` only for the main shell or large hero surfaces.
- Use little or no shadow. If separation requires one, use a very light low-blur shadow.
- Every clickable button, icon button, row action, link, toggle, menu item, and selectable card must include `cursor-pointer`.
- Icons must come from React Icons and include an accessible label when the icon has no visible text.
- Maintain compact but comfortable desktop density and touch targets of at least 44px on mobile.
- Avoid bright gradients, overly playful UI, heavy shadows, cartoonish styling, decorative badges, and excessive animation.

## Motion rules

- Use `motion/react` for page-section entrance only: `initial={{ opacity: 0, y: 12 }}`, `animate={{ opacity: 1, y: 0 }}`, and an approximately 220-300ms ease-out transition.
- Stagger major dashboard sections by about 40-60ms. Do not animate every table cell or every data refresh.
- Use `AnimatePresence` for dialogs, mobile drawers, menus, and conditional empty/error panels.
- Modal backdrop: fade opacity over roughly 150-200ms. Modal panel: subtle opacity plus `y: 8` or scale from `0.98`; no bounce.
- Respect `prefers-reduced-motion` via `useReducedMotion` or global reduced-motion styles.
- Animations must never delay data access or prevent keyboard interaction.

## Shared interaction patterns

- Use an accessible modal component with a dimmed backdrop, focus trap, Escape-to-close, outside-click handling where safe, labelled title/description, body scroll lock, and focus restoration.
- Use a confirmation variant for delete, reject, deactivate, reset-password, and other high-impact actions.
- Use responsive tables on desktop and compact record cards or controlled horizontal scrolling on small screens.
- Use server pagination where supported. Debounce server search by approximately 300ms and reset to page 1 when filters change.
- Keep URL query parameters synchronized for page, search, status, and filters so views are refreshable and shareable.
- Use skeletons for initial loading, localized spinners for button mutations, and retry actions for recoverable failures.

---

# Recommended Project Structure

```text
app/
  api/auth/login/route.ts
  api/auth/logout/route.ts
  api/backend/[...path]/route.ts
  dashboard/
    layout.tsx
    page.tsx
    events/page.tsx
    blogs/page.tsx
    books/page.tsx
    quiz/page.tsx
    verse-of-day/page.tsx
    users/page.tsx
    moderation/page.tsx
    notifications/page.tsx
    admin-management/page.tsx
    audit-logs/page.tsx
    exports/page.tsx
    system-configuration/page.tsx
components/
  dashboard/
  ui/
  forms/
hooks/
lib/
  api/client.ts
  api/endpoints.ts
  auth/roles.ts
  auth/session.ts
  formatters.ts
  validators.ts
types/
  api.ts
  auth.ts
  domain.ts
proxy.ts
```

The explicit route files should replace the current generic `[section]` placeholders as modules are implemented. Shared endpoint functions must own URL construction and response normalization; page components should not concatenate API URLs directly.

---

# [x] Step 1 - Bootstrap the V2 visual foundation

## Requirements

- Retain the existing Next.js, TypeScript, Tailwind CSS, React Icons, Toastify, and `motion` dependencies.
- Retain the local Aeonik configuration in the root layout with 300, 400, 500, 600, 700, and 900 weights.
- Keep the current white-and-blue login visual direction.
- Normalize the brand, primary-action, surface, border, text, and dark-theme tokens described above.
- Ensure the root body uses Aeonik and the background/text semantic tokens.
- Keep one global ToastContainer with restrained styling and mobile-safe placement.

## Success Criteria

- Aeonik is visibly applied across authentication and dashboard routes with no font 404s.
- Primary buttons use `#2563EB` before hover and the dashboard rail uses `#173F91`.
- No page introduces gradients, oversized shadows, playful decoration, or a competing color system.
- Light and dark color tokens are defined centrally.

---

# [x] Step 2 - Complete the login experience

## Requirements

- Keep the completed email and password form, password visibility control, validation, pending state, Toastify feedback, and responsive two-column composition.
- Login contract: `POST /api/admin/login` with JSON `{ "email": string, "password": string }`.
- Normalize the response from `data.accessToken` and `data.user`; the user object must include the effective admin role.
- Disable the submit button while pending and prevent duplicate requests.
- Never log credentials or access tokens.
- Preserve the current admin-focused design without the testimonial component.
- Step 4 will migrate token persistence to the protected session layer; until that migration lands, the existing implementation remains the temporary compatibility path.

## Success Criteria

- Valid credentials redirect to `/dashboard` and invalid credentials produce a useful toast without clearing the email field.
- The page is keyboard accessible and usable at 320px width.
- All clickable controls display a pointer cursor and clear focus-visible styling.

---

# [x] Step 3 - Establish the responsive dashboard shell

## Requirements

- Keep the completed icon-first desktop sidebar with animated hover expansion.
- Keep the mobile drawer, backdrop, menu trigger, date display, dark-mode toggle, notifications shortcut, and logout action.
- Keep the required navigation destinations: Overview, Events, Blogs, Books, Quiz, Verse of Day, Users, Moderation, Notifications, Admin Management, Audit Logs, Exports, and System Configuration.
- Derive active navigation state from the current pathname.
- Ensure sidebar labels, tooltips, and focus behavior remain usable when the rail is collapsed.
- Preserve the rounded main-shell layout and responsive content padding.

## Success Criteria

- Sidebar expansion does not shift the main content unexpectedly.
- The mobile drawer closes on backdrop click, Escape, navigation, and logout.
- Each navigation item resolves to either the completed page or its temporary placeholder without a 404.
- Theme and layout remain stable after refresh.

---

# [x] Step 4 - Build the production API, session, authorization, and shared UI layer

## Requirements

### Session and API transport

- Add a Next.js login route handler that forwards credentials to `${NEXT_PUBLIC_API_BASE_URL}/api/admin/login`, validates the backend response, and stores the access token in an `HttpOnly`, `Secure` in production, `SameSite=Lax` cookie.
- Add a logout route handler that clears the cookie and performs a best-effort backend logout only if `/api/admin/logout` is available; local session removal must always succeed.
- Add a catch-all backend proxy at `/api/backend/[...path]` that reads the server-side cookie, injects the Bearer header, forwards method/query/body/content type, and correctly streams file downloads and multipart uploads.
- Configure the client API layer with base URL `/api/backend`, a request timeout, JSON defaults, and a single response/error normalizer.
- Do not forward client-supplied Authorization headers through the proxy.
- Normalize the backend's possible response shapes (`data`, nested `data.data`, pagination metadata, message, validation errors) into typed results.
- On 401, clear the local session and redirect to login with a `returnTo` value. On 403, keep the session and show a permission-denied state. Do not redirect-loop.

### Route protection and roles

- Add Next.js 16 `proxy.ts` protection for `/dashboard/:path*`. Unauthenticated requests redirect to `/?returnTo=...`; authenticated users visiting `/` may redirect to `/dashboard`.
- Decode only non-sensitive JWT claims for expiry and role-aware UI. Never treat client decoding as authorization.
- Define role helpers for `admin` and `superadmin` (plus any exact role strings returned by the backend).
- Restrict Admin Management, Audit Logs, Data Exports, and System Configuration according to backend permissions; hide inaccessible nav items and handle a direct URL with a 403 panel.
- Add a small session endpoint or server utility to return the safe current-admin profile without exposing the token.

### Shared components

- Implement typed `Button`, `IconButton`, `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`, `Modal`, `ConfirmModal`, `DropdownMenu`, `PageHeader`, `StatCard`, `DataTable`, `Pagination`, `SearchField`, `FilterBar`, `Skeleton`, `EmptyState`, `ErrorState`, and `StatusPill` components.
- Add a reusable animated `PageSection` wrapper following the motion rules in this document.
- Add shared formatting for dates, relative time, numbers, booleans, and downloadable filenames.
- Add validation helpers for email, password, required text, dates, URLs, file types, and file size.

## Success Criteria

- Protected pages cannot be opened after the cookie expires or is removed.
- Access tokens are absent from `localStorage`, rendered HTML, client logs, and client-readable cookies.
- JSON requests, multipart uploads, and CSV/Excel downloads all work through the same authenticated transport.
- A representative 401, 403, 422, 500, and network timeout each produces the correct user-facing state.
- Feature pages can be built without duplicating fetch, pagination, modal, toast, or error-handling logic.

---

# [x] Step 5 - Replace the overview placeholders with live dashboard analytics

## Requirements

- Replace `app/dashboard/page.tsx` dummy components with typed live data.
- Prefer `GET /api/admin/analytics/dashboard` when it returns the combined payload. Support `overview`, `activity`, `trending`, `systemHealth`, `degraded`, and `failedSections` fields.
- If the combined endpoint is unavailable, compose the page from:
  - `GET /api/admin/analytics/overview`
  - `GET /api/admin/analytics/activity`
  - `GET /api/admin/analytics/trending`
  - `GET /api/admin/analytics/system`
- Load upcoming-event context from `GET /api/admin/events/upcoming` only when it is not already included in the dashboard response.
- Build four restrained KPI cards from real values such as users, prayers, events, and published content. Show comparison text only when the API supplies a legitimate comparison period.
- Add an activity/trend visualization only for real time-series data. Use a lightweight chart solution already present in the project like recharts; if none exists, use accessible CSS/SVG rather than adding a large chart package solely for decoration.
- Add recent activity, content-status summary, upcoming events, and system-health panels based on available response sections.
- Handle partial failure: a failed activity section must not hide valid overview data. Use `degraded`/`failedSections` to render localized retry panels.
- Add a manual refresh action with last-updated time; do not poll aggressively.
- Wrap the page title, KPI group, and major panels in staggered `PageSection` entrance animations.

## Success Criteria

- No dashboard number or activity record is hard-coded.
- Partial backend failure leaves successful sections visible and clearly labels failed sections.
- Refresh updates data without a full page reload or duplicate toast spam.
- Layout is readable as a multi-column dashboard on desktop and a single-column flow on mobile.

---

# [x] Step 6 - Implement complete event, speaker, and event-category management

## Requirements

### Listing and discovery

- Replace `/dashboard/events` placeholder with a page supporting All, Upcoming, and Past views.
- Use `GET /api/admin/events` for the main paginated list, `GET /api/admin/events/upcoming`, `GET /api/admin/events/past`, and `GET /api/admin/events/search?q=<query>` where appropriate.
- Prefer backend pagination metadata. Keep `page`, `limit`, `q`, and temporal filter in URL search parameters.
- Display title, event date/time, venue or location, category, speaker count, livestream state, and available status fields.
- Include skeleton, empty, error, and retry states.

### Create, edit, view, and delete

- Create events with `POST /api/admin/events` and edit with `PUT /api/admin/events/:id`.
- Retrieve the canonical record for a detail/edit view with `GET /api/admin/events/:id`.
- Delete with `DELETE /api/admin/events/:id` after a confirmation modal that names the event.
- Build form fields from the backend contract, including title, description, date/time, venue/location, category, speakers, livestream URL/state, and any required status fields. Do not invent required properties; map optional fields defensively.
- Validate that end time is after start time, URLs are valid, required fields are present, and dates are serialized in the backend's expected ISO format.
- After mutations, close only on success, toast the result, and refresh/invalidate the relevant list and dashboard analytics.

### Media and related records

- Upload an event banner with `POST /api/admin/events/upload-banner` using multipart form data and the backend's documented file field.
- Upload gallery media with `POST /api/admin/events/gallery/upload` using multipart form data. Show upload progress or a localized pending state, file preview, type/size validation, and recoverable failure.
- Update livestream details/state with `PUT /api/admin/events/:id/live`.
- Create speakers with `POST /api/admin/speakers`, edit with `PUT /api/admin/speakers/:id`, and delete with `DELETE /api/admin/speakers/:id`.
- Create event categories with `POST /api/admin/event-categories`, edit with `PUT /api/admin/event-categories/:id`, and delete with `DELETE /api/admin/event-categories/:id`.
- Use nested modals only when necessary. A create-event modal may open a lightweight create-speaker/category modal, but the parent form values must survive.

### UI behavior

- Use a clean table on desktop and event cards on mobile.
- Put row actions in an accessible overflow menu; do not display a wall of icon buttons.
- Use a large modal or drawer for create/edit, a preview modal for details, and a focused confirmation modal for deletion.
- Animate the page sections and modal/backdrop only; do not animate each row during search.

## Success Criteria

- An admin can search, filter, create, inspect, edit, and delete an event without refreshing the browser.
- Banner, gallery, speaker, category, and livestream workflows persist to the backend.
- Failed uploads do not discard the rest of the form.
- Upcoming and Past views classify records using backend results rather than client-only guesses when endpoints are available.

---

# [x] Step 7 - Implement complete blog and comment management

## Requirements

### Blog list and stats

- Replace `/dashboard/blogs` with a paginated list from `GET /api/admin/blogs`.
- Support `status=draft|published|all`, page/limit, and any backend-supported query fields. If the endpoint has no search parameter, filter only the currently loaded page and label that behavior honestly.
- Derive visible totals from backend totals/status counts. Never fabricate views, comments, or publishing statistics.
- Display title, author where available, category, publication status, created/updated date, and cover thumbnail.

### Authoring workflow

- Create with `POST /api/admin/blogs`, read with `GET /api/admin/blogs/:id`, update with `PUT /api/admin/blogs/:id`, and delete with `DELETE /api/admin/blogs/:id`.
- Publish with `PUT /api/admin/blogs/:id/publish`; publishing must be a separate explicit action and confirmation when irreversible behavior is possible.
- Support fields exposed by the backend such as title, excerpt/summary, content, category, tags, author, status, and cover image.
- Provide a practical editor using existing project dependencies. Do not add an oversized editor package unless plain structured text/HTML editing cannot satisfy the API.
- Preserve unsaved form values when an image upload fails. Warn before closing a dirty modal or navigating away.

### Images, categories, refresh, and comments

- Upload cover/content images with `POST /api/admin/blogs/upload-image` as multipart form data, validating image type and configured size limits.
- Trigger external/backend refresh with `POST /api/admin/blogs/refresh`; show the returned message and update the list afterward.
- Create blog categories with `POST /api/admin/blog-categories`, edit with `PUT /api/admin/blog-categories/:id`, and delete with `DELETE /api/admin/blog-categories/:id`.
- Delete a comment only with a real identifier using `DELETE /api/admin/blogs/comments/:commentId`. Never ask an admin to type a raw ID when the ID is already present in the selected blog/comment payload.
- If comment listing is not returned by the blog-detail contract, omit the comment panel until a real list endpoint exists; do not substitute mock comments.

### UI behavior

- Use Draft/Published/All tabs, a table/card list, and a large authoring modal or dedicated in-dashboard editor panel.
- Use status pills only for meaningful workflow states, not decoration.
- Use confirmation modals for publish, blog deletion, category deletion, and comment deletion.

## Success Criteria

- Created or edited posts reappear from the API after reload without browser-storage merging.
- Draft and published filters reflect backend status.
- Publish, refresh, upload, category, and comment-delete mutations have pending, success, and failure handling.
- No dummy blog cards, statistics, or comments remain.

---

# [x] Step 8 - Implement complete book-library management

## Requirements

- Replace `/dashboard/books` with data from `GET /api/admin/books`.
- Search with `GET /api/admin/books/search?q=<query>` and debounce requests. Restore the complete list when the query is cleared.
- Retrieve individual records with `GET /api/admin/books/:id`.
- Create with `POST /api/admin/books`, edit with `PUT /api/admin/books/:id`, and delete with `DELETE /api/admin/books/:id`.
- Use multipart form data for create/update where a cover is included. Support the backend fields `title`, `author`, `description`, `audience`, `totalChapters`, and `coverImage` plus documented aliases.
- Validate positive integer chapter counts, required title/author, permitted cover file types, and cover file size.
- Show cover preview with a restrained fallback icon when absent or broken.
- Use a desktop table or compact media list and mobile book cards. Provide View, Edit, and Delete from an overflow menu.
- Use a detail modal for metadata, an edit modal with scrollable content, and a named confirmation modal for delete.
- Refresh the exact affected record/list after mutation; do not optimistically hide a failed deletion.

## Success Criteria

- Book create, edit, search, detail, cover upload, and delete work against the backend.
- Search race conditions cannot replace a newer query with stale results.
- The interface remains usable with long descriptions, missing covers, and large result sets.

---

# [x] Step 9 - Implement quiz administration and Verse of the Day

## Requirements

### Quiz question bank

- Replace `/dashboard/quiz` using `GET /api/admin/quiz` and load selectors/metadata from `GET /api/admin/quiz/meta`.
- Create with `POST /api/admin/quiz/add` (use `POST /api/admin/quiz` only as a confirmed alias), edit with `PUT /api/admin/quiz/:id`, and delete with `DELETE /api/admin/quiz/:id`.
- Activate and deactivate with `PUT /api/admin/quiz/activate/:id` and `PUT /api/admin/quiz/deactivate/:id`.
- Support bulk creation with `POST /api/admin/quiz/bulk` and bulk deletion with `DELETE /api/admin/quiz/bulk` using a JSON body containing the selected IDs.
- Question forms must support `question`, `options`, `correctAnswer` or `correctIndex` according to the backend response, `level`, and `difficulty`.
- Require at least two non-empty options, exactly one valid correct answer, and no duplicate options after trimming.
- Add table selection with select-all for the current page only, visible selection count, and a confirmation modal before bulk delete.

### Daily quiz

- Read pool information from `GET /api/admin/quiz/daily/pool/info`.
- Add eligible questions with `POST /api/admin/quiz/daily/pool/add`.
- Set the daily quiz with `POST /api/admin/quiz/daily/set` using the selected date/question contract.
- Keep question-bank filters and daily-pool selection as distinct UI sections so selections cannot be confused.

### Verse of the Day

- Replace `/dashboard/verse-of-day` with a form using `POST /api/admin/verse/set`.
- Support `date`, `reference`, `book`, `chapter`, `verse`, `text`, and `translation` according to the backend contract.
- Fetch a suggested verse with `GET /api/admin/verse/sample`, preview the effective selection with `GET /api/admin/verse/preview`, and display real history from `GET /api/admin/verse/history`.
- Validate the date, reference, verse text, and numeric chapter/verse inputs. Confirm replacing an already configured date when the backend indicates a conflict.

### UI behavior

- Use separate clean panels/tabs for Question Bank and Daily Quiz, not a crowded single form.
- Use modals for create/edit question and confirmations. Use a side-by-side editor/preview on wide screens for Verse of the Day and stacked panels on mobile.
- Animate the major panels on first load only.

## Success Criteria

- Single and bulk quiz operations persist and update the correct list.
- Activation state and daily-pool counts come from the backend.
- An admin can sample, preview, set, and review verse history with no mock data.
- Correct answers are never lost or shifted when options are edited.

---

# [x] Step 10 - Implement user administration and admin-account management

## Requirements

### User administration

- Replace `/dashboard/users` with `GET /api/admin/users?page=<page>&limit=<limit>&search=<query>&verified=<value>&includeDeleted=<boolean>`.
- Keep backend pagination totals and the current query state in the URL.
- Load a selected user's canonical detail with `GET /api/admin/users/:userId` and show profile fields, verification/status state, created date, and other real activity metadata returned by the API.
- Activate with `PATCH /api/admin/users/:userId/activate`, deactivate with `PATCH /api/admin/users/:userId/deactivate`, and update an explicit status with `PATCH /api/admin/users/:userId/status`. Use the documented `PUT` aliases only if the deployed API requires them.
- Soft-delete with `DELETE /api/admin/users/:userId` and restore with `PATCH /api/admin/users/:userId/restore`.
- Reset a password with `PUT /api/admin/users/:userId/reset-password` using only backend-required fields. Never display an existing password or place a generated password in logs.
- Support V1-equivalent bulk deletion by issuing bounded, concurrency-limited delete requests for selected IDs unless the API exposes a verified bulk endpoint. Report partial success by user and leave failed rows selected.
- Require confirmation for deactivate, delete, restore, password reset, and bulk delete. The modal must clearly state the effect.
- Provide filters for verified/status/deleted users only where supported by the endpoint.

### Admin-account management

- Replace `/dashboard/admin-management` with the list from `GET /api/admin/management`.
- Create an administrator with `POST /api/admin/management` using `{ "username", "email", "password", "role" }`.
- Delete an administrator with `DELETE /api/admin/management/:adminId` after named confirmation.
- Derive role counts from returned records; do not hard-code admin totals.
- Only show permitted roles in the create form. Prevent deleting the currently signed-in admin in the UI when their identity is known, while still handling backend refusal.
- Treat this page as super-admin restricted unless the backend explicitly authorizes another role.

### UI behavior

- Use a user table with multi-select, filters, pagination, and an overflow action menu. On mobile, use cards with the most important status and actions.
- Use a right-side detail drawer or large modal for user detail and a focused modal for creating an admin.
- Do not recreate the V1 Roles page because it was a duplicate user list, not a functioning permission editor.

## Success Criteria

- Search, pagination, filters, user detail, activation, deactivation, status change, delete, restore, reset password, and bulk delete persist correctly.
- Partial bulk failures are explicit and recoverable.
- Ordinary admins cannot discover or invoke super-admin-only admin-management controls through the UI.
- User and admin statistics are derived entirely from live responses.

---

# [x] Step 11 - Implement the unified prayer and comment moderation workspace

## Requirements

- Replace `/dashboard/moderation`; do not create a separate prayer-management page.
- Load overall queue/count information from `GET /api/admin/moderation/queue` when available.
- Load prayer items from `GET /api/admin/moderation/prayers` and comment items from `GET /api/admin/moderation/comments`.
- Approve a prayer with `PUT /api/admin/moderation/prayers/:id/approve`, flag it with `PUT /api/admin/moderation/prayers/:id/flag`, and reject/delete it with `DELETE /api/admin/moderation/prayers/:id/reject`.
- Approve a comment with `PUT /api/admin/moderation/comments/:id/approve`, flag it with `PUT /api/admin/moderation/comments/:id/flag`, and reject/delete it with `DELETE /api/admin/moderation/comments/:id/reject`.
- Support the backend's pending/flagged filters and pagination if returned. If filtering is client-side, make the scope clear and do not imply that unloaded records were searched.
- Show the content, author identity when available, content type, reason/flags, submitted date, and moderation status without exposing private information unnecessarily.
- Reject requires a confirmation modal and optional reason only if accepted by the backend. Approve can be a direct action with a short undo only if a verified reversal endpoint exists; otherwise use confirmation for sensitive content.
- Update counts and remove/move a moderated item only after success. A failed action must restore the exact item and its position.
- Do not use V1's `/prayer/mine` request with an admin token or undocumented `/admin/prayers/:id` mutations.

## Success Criteria

- Pending and flagged prayers/comments are reviewable from one coherent workspace.
- Approve, flag, and reject actions call only the documented moderation routes.
- Queue counts remain consistent after each mutation and after refresh.
- Empty queues, partial errors, long content, and missing author metadata render safely.

---

# [x] Step 12 - Implement notification history, direct send, and broadcast

## Requirements

- Replace `/dashboard/notifications` with the paginated history from `GET /api/admin/notifications/all`.
- Support server-provided pagination/search/filter metadata. Show recipient/audience, title, message preview, channel/type, delivery state, created date, and delivery counts only when present.
- Send a direct notification with `POST /api/admin/notifications/send` using the documented recipient identifier plus title/message and any supported type/data fields.
- Send a broadcast with `POST /api/admin/notifications/broadcast`; clearly distinguish All Users or a supported segment from a single recipient.
- Resend with `POST /api/admin/notifications/:notificationId/resend` after confirmation that identifies the original audience.
- Delete history with `DELETE /api/admin/notifications/:notificationId` after confirmation. Explain that deleting history may not retract a delivered notification.
- Derive notification statistics from backend totals or the loaded data with an honest scope label.
- Use tabs or a segmented control for History, Direct Send, and Broadcast. Keep forms compact and show a message preview.
- Prevent accidental double broadcasts with a confirmation modal, request lock, and idempotency key if the backend supports one.
- After send/resend/delete, refresh history and statistics and show one concise toast.

## Success Criteria

- Direct, broadcast, resend, and delete actions persist and appear correctly in history.
- The UI cannot confuse a direct recipient with a broadcast audience.
- Long messages, failed delivery states, empty history, and pagination are handled responsively.
- No notification statistic or delivery status is fabricated.

---

# [x] Step 13 - Implement audit logs and controlled data exports

## Requirements

### Audit logs

- Replace `/dashboard/audit-logs` with paginated data from `GET /api/admin/audit-logs`.
- Load available filter values from `GET /api/admin/audit-logs/filters` rather than hard-coding action/resource/admin choices.
- Support query parameters accepted by the API, including page/limit plus `action`, `resource`, `admin`, and `search` where documented.
- Display timestamp, admin identity, action, resource type/identifier, outcome, and safe metadata. Truncate large metadata with an accessible details modal.
- Never render secrets, bearer tokens, passwords, OTP values, or raw sensitive headers even if malformed data contains them. Redact common sensitive keys before rendering.
- Export filtered logs with `GET /api/admin/audit-logs/export?format=csv` or `format=excel`, passing the active filters and preserving the backend filename when available.

### Data exports

- Replace `/dashboard/exports` with supported dataset cards for Users and Prayers.
- Preview a dataset with `GET /api/admin/exports/preview?dataset=users` or `dataset=prayers` before download. Show row count, included columns, and scope when returned.
- Download users via `GET /api/admin/exports/users?format=csv` or `format=excel`.
- Download prayers via `GET /api/admin/exports/prayers?format=csv`; enable Excel only if the endpoint verifies that format.
- Treat downloads as binary/blob responses, parse `Content-Disposition` safely, revoke temporary object URLs, and never attempt to parse a file response as JSON.
- Keep exports super-admin restricted unless the backend grants access. Ask for confirmation before exporting sensitive user or prayer data.
- Record active filters/scope in the confirmation copy so the administrator understands what will be downloaded.

### UI behavior

- Audit filters should collapse into a mobile filter drawer. Keep the desktop table dense but readable.
- Export cards should use plain bordered surfaces, concise descriptions, format selection, preview, and a single primary download action.
- Show localized progress while preparing a download and a useful error if the backend returns JSON instead of a file.

## Success Criteria

- Audit pagination and filters produce matching server results and matching exported content.
- CSV/Excel files download with sensible names and open as the intended format.
- Sensitive metadata is redacted from the UI.
- Unauthorized roles cannot access export controls or trigger export requests.

---

# [x] Step 14 - Implement system configuration and admin password security

## Requirements

### System configuration

- Replace `/dashboard/system-configuration` with values from `GET /api/admin/system-config`.
- Read an individual setting with `GET /api/admin/system-config/:key` when a fresh canonical value is required.
- Create a new setting with `POST /api/admin/system-config` and update an existing value with `PUT /api/admin/system-config/:key`.
- Support backend fields such as `key`, `value`, and `description`; use `type`, `label`, or `category` only when they are returned or accepted by the real API.
- Group settings by backend-provided category when available, otherwise use a neutral General group rather than inventing categories.
- Render boolean values as switches, enumerations as selects, numbers as numeric inputs, JSON as validated text, and secrets as masked fields only when type information is reliable.
- Require confirmation for configuration changes with broad system impact. Show previous and proposed values, but never reveal a stored secret.
- On update failure, restore the displayed server value and keep the edit modal open.
- Restrict create/edit controls by role; a read-only view may be shown only if the backend allows it.

### Admin password security

- Add a security panel accessible from the authenticated admin menu or System Configuration area.
- Request an OTP with `POST /api/admin/settings/password/request-otp`.
- Change the password with `PUT /api/admin/settings/password` using `{ "oldPassword", "newPassword", "otp" }`.
- Validate password confirmation and backend password policy, provide resend cooldown, and never persist password or OTP values.
- Clear all password fields after success, close the modal, toast once, and require re-authentication if instructed by the backend.

### UI behavior

- Use a searchable settings list with restrained grouped cards and an edit modal/backdrop.
- Avoid turning every setting into a colorful card. Use typography, spacing, and borders for hierarchy.
- Animate only the page groups and dialog transitions.

## Success Criteria

- Settings reload with their new backend values after create/update.
- Boolean, numeric, text, and structured values validate without corrupting their types.
- The OTP/password workflow handles expiry, resend cooldown, wrong OTP, wrong old password, and success safely.
- Secrets and credential inputs never appear in logs, URL parameters, or persistent browser storage.

---

# [x] Step 15 - Complete integration QA, accessibility, responsiveness, and release readiness

## Requirements

### Functional verification

- Build a feature/API verification matrix covering every request in Steps 2 and 4-14, including method, path, expected role, payload type, success response, empty response, and common failure response.
- Test with at least one ordinary admin and one super-admin account. Confirm navigation visibility and direct-URL authorization behavior.
- Verify login, refresh, expired-session redirect, logout, and return-to redirect.
- Verify each create/update/delete/approve/publish/send/export workflow using records that can safely be changed.
- Confirm the dashboard and all lists reflect mutations after invalidation without a hard refresh.
- Test multipart uploads with valid, oversized, and unsupported files.
- Test CSV/Excel downloads and ensure JSON errors are surfaced instead of downloaded as corrupted files.

### Quality and maintainability

- Remove the generic `[section]` placeholder once every required explicit route exists.
- Remove dead V1 compatibility code, duplicated fetch helpers, unused components/imports, console statements, hard-coded tokens, and mock content.
- Ensure every API response and form model has a useful TypeScript type; avoid broad `any` at endpoint boundaries.
- Run the project's lint, type-check, and production build commands and resolve all warnings that affect correctness or accessibility.
- Add focused tests for response normalization, role helpers, validators, pagination/query state, and destructive confirmation behavior.
- Add integration or component tests for login failure, one CRUD module, moderation action, broadcast confirmation, and binary export handling.

### Accessibility and responsive QA

- Verify keyboard-only navigation, visible focus, modal focus trapping/restoration, Escape handling, labels, error associations, and screen-reader names for icon buttons.
- Verify color contrast in light and dark themes, including status pills and disabled controls.
- Test at 320px, 375px, 768px, 1024px, and wide desktop widths.
- Ensure tables do not force the entire page wider than the viewport and mobile drawers/modals fit beneath browser chrome.
- Confirm `prefers-reduced-motion` removes non-essential transitions.

### Release documentation

- Add `.env.example` with `NEXT_PUBLIC_API_BASE_URL` and comments for local/deployed values; never commit real credentials.
- Update the project README with setup, development, build, role expectations, API base URL rules, upload/download behavior, and a route/module inventory.
- Document any endpoint whose deployed behavior differs from the Postman contract in a short `docs/api-notes.md` rather than adding silent client workarounds.
- Record known limitations only when backed by a missing/failed API; do not fill them with dummy features.

## Success Criteria

- `npm run lint`, TypeScript checking, tests, and `npm run build` all pass.
- Every sidebar destination is functional, permission-aware, responsive, and free of dummy content.
- The app reaches working V1 feature parity while excluding V1's known placeholders and unreliable routes.
- The final UI consistently uses Aeonik, navy/blue brand tokens, white/gray surfaces, restrained motion, subtle borders/radii, and accessible modal backdrops.
- A new developer can run and continue the project using only the repository documentation and environment configuration.

---

# Final Readiness Definition

The V2 rebuild is complete when all unchecked steps above are checked, every listed endpoint has been verified against the deployed backend, every sidebar route operates on real data, and the release checks in Step 15 pass. A visually complete placeholder does not count as completion.

The intended delivery is a calm, professional administration product: strong blue identity, white and gray-100 working surfaces, compact information hierarchy, restrained Framer Motion transitions through `motion/react`, accessible modal backdrops, and no decorative excess.
