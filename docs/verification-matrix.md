# Feature/API verification matrix

Generated from the delivery plan and the attached Postman collection. “Admin” includes super-admin; “Super” is restricted in navigation, server-rendered route access, and backend authorization. Success shapes are normalized but values remain backend-owned.

| Feature | Method | Path | Role | Payload | Success / empty | Common failure |
|---|---|---|---|---|---|---|
| Login | POST | `/api/admin/login` via `/api/auth/login` | Public | JSON email, password | token + safe admin / n/a | 400/401 invalid credentials, 5xx/timeout |
| Session | GET | `/api/auth/session` | Admin | none | safe admin profile / 401 | 401 expired or missing cookie |
| Logout | POST | `/api/auth/logout` (backend logout best-effort) | Admin | none | local cookie cleared | backend failure does not block local logout |
| Backend proxy | all | `/api/backend/[...path]` | Admin | JSON, multipart, or none | streamed JSON/file / endpoint-defined | 401 redirect, 403 retained, 422 validation, 5xx/timeout |
| Analytics combined | GET | `/api/admin/analytics/dashboard` | Admin | query only | dashboard sections / degraded sections | partial 4xx/5xx |
| Analytics overview | GET | `/api/admin/analytics/overview` | Admin | none | metric object / missing fields shown honestly | 401/403/5xx |
| Analytics activity | GET | `/api/admin/analytics/activity` | Admin | none | activity array / empty chart | 401/403/5xx |
| Analytics trending | GET | `/api/admin/analytics/trending` | Admin | none | trending object / empty sections | 401/403/5xx |
| Analytics system | GET | `/api/admin/analytics/system` | Admin | none | health object / unavailable fields | 401/403/5xx |
| Upcoming context | GET | `/api/admin/events/upcoming` | Admin | page/limit | event list / empty | 401/403/5xx |
| Events list | GET | `/api/admin/events` | Admin | page, limit | events + pagination / empty | 401/403/5xx |
| Events past | GET | `/api/admin/events/past` | Admin | page, limit | events + pagination / empty | 401/403/5xx |
| Events search | GET | `/api/admin/events/search` | Admin | q, page, limit | matches / empty | 400 query, 5xx |
| Event detail | GET | `/api/admin/events/:id` | Admin | none | event / n/a | 404, 403 |
| Event create | POST | `/api/admin/events` | Admin | JSON event | created event | 422 validation, 403 |
| Event update | PUT | `/api/admin/events/:id` | Admin | JSON event | updated event | 404/422/403 |
| Event delete | DELETE | `/api/admin/events/:id` | Admin | none | message / n/a | 404/409/403 |
| Event banner | POST | `/api/admin/events/upload-banner` | Admin | multipart `banner` | URL metadata / n/a | 413 size, 415 type, 422 |
| Event gallery | POST | `/api/admin/events/gallery/upload` | Admin | multipart `images` | URL list / empty | 413/415/422 |
| Event live | PUT | `/api/admin/events/:id/live` | Admin | JSON platform, URL, thumbnail | updated event | 404/422 |
| Speakers list | GET | `/api/speakers` | Admin | none | speakers / empty | 401/5xx |
| Speaker create/update/delete | POST/PUT/DELETE | `/api/admin/speakers[/:id]` | Admin | JSON speaker / none | record or message / empty n/a | 404/422/403 |
| Categories list | GET | `/api/event-categories` | Admin | none | categories / empty | 401/5xx |
| Event category C/U/D | POST/PUT/DELETE | `/api/admin/event-categories[/:id]` | Admin | JSON name / none | record or message | 404/422/403 |
| Blogs list | GET | `/api/admin/blogs` | Admin | page, limit, status | blogs + pagination / empty | 401/403/5xx |
| Blog detail | GET | `/api/admin/blogs/:id` | Admin | none | blog incl. real comments / absent comments omitted | 404/403 |
| Blog create/update/delete | POST/PUT/DELETE | `/api/admin/blogs[/:id]` | Admin | JSON or multipart / none | record or message | 404/413/415/422 |
| Blog publish | PUT | `/api/admin/blogs/:id/publish` | Admin | none | published record/message | 404/409/403 |
| Blog image | POST | `/api/admin/blogs/upload-image` | Admin | multipart image | URL metadata | 413/415/422 |
| Blog refresh | POST | `/api/admin/blogs/refresh` | Admin | none | refresh message | 409/5xx |
| Blog category C/U/D | POST/PUT/DELETE | `/api/admin/blog-categories[/:id]` | Admin | JSON category / none | record or message | 404/422/403 |
| Blog comment delete | DELETE | `/api/admin/blogs/comments/:commentId` | Admin | none | message | 404/403 |
| Books list/search | GET | `/api/admin/books` or `/api/admin/books/search` | Admin | page, limit, q | books + optional pagination / empty | 400/401/5xx |
| Book detail | GET | `/api/admin/books/:id` | Admin | none | book | 404/403 |
| Book create/update | POST/PUT | `/api/admin/books[/:id]` | Admin | multipart or JSON book | book | 413/415/422/404 |
| Book delete | DELETE | `/api/admin/books/:id` | Admin | none | message | 404/409/403 |
| Quiz list/meta | GET | `/api/admin/quiz`, `/api/admin/quiz/meta` | Admin | filters/page or none | questions/metadata / empty | 401/403/5xx |
| Quiz create | POST | `/api/admin/quiz/add` | Admin | JSON question | question | 422/409/403 |
| Quiz update/delete | PUT/DELETE | `/api/admin/quiz/:id` | Admin | JSON question / none | record/message | 404/422/403 |
| Quiz activate/deactivate | PUT | `/api/admin/quiz/activate/:id`, `/deactivate/:id` | Admin | none | updated status | 404/409/403 |
| Quiz bulk create/delete | POST/DELETE | `/api/admin/quiz/bulk` | Admin | JSON questions or IDs | counts/failures | 400/422/403 |
| Daily pool info | GET | `/api/admin/quiz/daily/pool/info` | Admin | none | pool data / empty | 401/403/5xx |
| Daily pool add | POST | `/api/admin/quiz/daily/pool/add` | Admin | JSON question IDs | updated pool | 400/422/403 |
| Daily quiz set | POST | `/api/admin/quiz/daily/set` | Admin | JSON date + questions | daily quiz | 409/422/403 |
| Verse set | POST | `/api/admin/verse/set` | Admin | JSON verse contract | saved verse | 409/422/403 |
| Verse sample/preview/history | GET | `/api/admin/verse/sample`, `/preview`, `/history` | Admin | date/query where applicable | record/list / empty | 400/401/5xx |
| Users list | GET | `/api/admin/users` | Admin | page, limit, search, verified, includeDeleted | users + stats/pagination / empty | 401/403/5xx |
| User detail | GET | `/api/admin/users/:userId` | Admin | none | user | 404/403 |
| User activate/deactivate/status | PATCH | `/api/admin/users/:id/activate`, `/deactivate`, `/status` | Admin | status JSON only for `/status` | updated user | 404/409/422 |
| User delete/restore | DELETE/PATCH | `/api/admin/users/:id`, `/restore` | Admin | none | updated/message | 404/409/403 |
| User password reset | PUT | `/api/admin/users/:id/reset-password` | Admin | JSON newPassword | message | 404/422/403 |
| Admin list/create/delete | GET/POST/DELETE | `/api/admin/management[/:id]` | Super | JSON username, email, password, role / none | list/record/message / empty | 401/403/404/422 |
| Moderation queue | GET | `/api/admin/moderation/queue` | Admin | none | counts / missing counts labeled | 401/403/5xx |
| Moderation lists | GET | `/api/admin/moderation/prayers`, `/comments` | Admin | status, page, limit | records/pagination / empty | 401/403/5xx |
| Prayer moderation | PUT/DELETE | `/api/admin/moderation/prayers/:id/{approve|flag|reject}` | Admin | none | message | 404/409/403 |
| Comment moderation | PUT/DELETE | `/api/admin/moderation/comments/:id/{approve|flag|reject}` | Admin | none | message | 404/409/403 |
| Notification history | GET | `/api/admin/notifications/all` | Admin | page, limit | notifications/pagination / empty | 401/403/5xx |
| Notification direct | POST | `/api/admin/notifications/send` | Admin | JSON userId, title, message, type | notification with USER target | 404 recipient, 422, 403 |
| Notification broadcast | POST | `/api/admin/notifications/broadcast` | Admin | JSON title, message, broadcast type | notification with ALL target | 422/403/5xx |
| Notification resend/delete | POST/DELETE | `/api/admin/notifications/:id/resend`, `/:id` | Admin | none | resend data/message | 404/403/5xx |
| Audit list/filters | GET | `/api/admin/audit-logs`, `/filters` | Super | page, limit, action, resource, admin, search | logs/options / empty | 401/403/5xx |
| Audit export | GET | `/api/admin/audit-logs/export` | Super | format + active filters | CSV or XLS blob | JSON 401/403/5xx surfaced |
| Export preview | GET | `/api/admin/exports/preview` | Super | dataset, limit | rows, total, optional columns/scope / empty | 400/401/403 |
| Users export | GET | `/api/admin/exports/users` | Super | csv or excel | CSV/XLS blob | JSON error surfaced |
| Prayers export | GET | `/api/admin/exports/prayers` | Super | csv | CSV blob | JSON error surfaced |
| Settings list/detail | GET | `/api/admin/system-config`, `/:key` | Super | none | settings/setting / empty or 404 | 401/403/404/5xx |
| Settings create/update | POST/PUT | `/api/admin/system-config[/:key]` | Super | JSON key/value/description or value | canonical setting | 409/422/403 |
| Password OTP | POST | `/api/admin/settings/password/request-otp` | Admin | none | email dispatch message | 429 cooldown/401/5xx |
| Password change | PUT | `/api/admin/settings/password` | Admin | JSON oldPassword, newPassword, otp | message + optional reauth | 400 expired OTP, 401 old password, 422 policy |

## Execution status

- Automated contract/unit/component coverage: `npm test`.
- Static checks: `npm run lint`, `npm run typecheck`, `npm run build`.
- Postman contract: attached collection contains successful assertions for the documented QA sequences, including notifications, audit exports, data exports, moderation, and configuration.
- Human verification: each delivered feature step was held for administrator verification before the next step began. Repeat role-specific destructive mutations only with designated disposable records.