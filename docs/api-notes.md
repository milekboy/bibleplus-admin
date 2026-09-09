# API notes

These notes record verified contract boundaries and explicit transport fallbacks. They are not dummy behavior.

- The backend may return compressed responses. The Next.js proxy requests identity encoding, forwards only `Content-Type` and `Content-Disposition`, and lets Next.js determine response framing. Upstream `Content-Length` is intentionally not forwarded because a decompressed stream can otherwise be truncated.
- The deployed Books list has returned all 20 records without usable pagination metadata. The UI therefore requests 10 and, only when metadata is absent, paginates the returned collection client-side at 10 records per page. The interface does not imply that unloaded records were searched.
- Moderation and notification list adapters accept documented pagination aliases. If pagination metadata is absent, their UI labels the fallback as scoped to the returned response.
- The notification contract does not document an idempotency key or broadcast segments. Broadcast is therefore All Users only and is protected by confirmation plus an in-flight request lock.
- Moderation reject endpoints do not document a reason body, so the client sends no invented rejection field. No reversal endpoint is documented for approvals, so approval requires confirmation.
- Users exports are verified for CSV and Excel. Prayer exports are verified for CSV only; the UI does not offer an unverified Prayer Excel format.
- Backend logout availability is not guaranteed. Local cookie deletion always completes, while backend logout is best-effort.