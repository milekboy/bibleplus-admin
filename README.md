# BiblePlus Admin V2

Production administration console for BiblePlus, built with Next.js 16, React 19, TypeScript, Tailwind CSS, Axios, Motion, and Recharts. The browser never stores or receives the backend bearer token; authenticated API traffic passes through the server-side `/api/backend` proxy using an HttpOnly cookie.

## Requirements

- Node.js 20 or newer
- npm 11 or newer
- A reachable BiblePlus API
- An administrator account; restricted modules require `superadmin`

## Environment setup

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL` to the backend origin. Both of these are valid:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api
```

The server normalizes a trailing slash and optional trailing `/api`, then appends `/api/<endpoint>`. Do not place credentials or bearer tokens in environment files intended for the browser.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Run the complete release gate with `npm run check`.

## Authentication and roles

Login credentials are sent to the local `/api/auth/login` route. A successful backend response creates an HttpOnly, SameSite=Lax session cookie (`Secure` in production). Expired sessions return to login with a validated `returnTo` path. Logout always clears the local cookie even if backend logout is unavailable.

- `admin`: dashboard, content, community, notifications, moderation, and personal Password Security.
- `superadmin`: all admin access plus Admin Management, Audit Logs, Data Exports, and System Configuration.

Navigation hiding is a convenience, not the security boundary. Restricted pages perform server-side role checks, and the backend remains authoritative.

## API and data rules

- Runtime client requests use `/api/backend`; do not call the external API directly from client components.
- JSON success/error envelopes and pagination aliases are normalized centrally.
- Lists use backend pagination when returned and explicitly scoped client fallbacks otherwise.
- Mutations refresh canonical backend data after success; destructive and broad actions require confirmation.
- No feature data is persisted in browser storage.

See [API notes](docs/api-notes.md) and the [verification matrix](docs/verification-matrix.md).

## Uploads and downloads

Event and blog image uploads use multipart form data, validate MIME type and size before submission, retain form state after recoverable errors, and expose localized progress.

CSV/Excel responses are requested as blobs. The client validates the MIME type, sanitizes and preserves `Content-Disposition` filenames, reports JSON error bodies, and revokes temporary object URLs. Users support CSV and Excel; Prayers support CSV only because Excel is not verified by the contract.

## Routes and modules

| Route | Module | Access |
|---|---|---|
| `/` | Login | Public |
| `/dashboard` | Live analytics overview | Admin |
| `/dashboard/events` | Events, speakers, categories, livestreams, uploads | Admin |
| `/dashboard/blogs` | Blogs, publishing, categories, comments, images | Admin |
| `/dashboard/books` | Book library and covers | Admin |
| `/dashboard/quiz` | Question bank, bulk actions, daily pool | Admin |
| `/dashboard/verse-of-day` | Verse editor, preview, sample, history | Admin |
| `/dashboard/users` | User search, status, reset, restore, deletion | Admin |
| `/dashboard/moderation` | Prayer and comment moderation | Admin |
| `/dashboard/notifications` | History, direct send, broadcast, resend | Admin |
| `/dashboard/security` | Current-admin password and OTP | Admin |
| `/dashboard/admin-management` | Administrator accounts | Super-admin |
| `/dashboard/audit-logs` | Filtered audit trail and exports | Super-admin |
| `/dashboard/exports` | Users and Prayers data exports | Super-admin |
| `/dashboard/system-configuration` | Typed system settings | Super-admin |

## Accessibility and responsive behavior

The shared dialog traps focus, supports Escape, restores prior focus, and disables backdrop dismissal while a request is pending. Icon-only controls have accessible names, inputs have visible focus states, tables are contained or replaced by cards on small screens, and non-essential animation is effectively disabled by `prefers-reduced-motion`. The dashboard theme toggle persists only the `light`/`dark` preference.

Target widths for release checks are 320, 375, 768, 1024, and wide desktop.