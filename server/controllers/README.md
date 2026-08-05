# Controllers

This layer is **partial**, not abandoned.

- `learning/activity/*` — route handlers used by `server/routes/learning/activity.js`
- Prefer new HTTP handlers under `server/routes/<domain>/` (see `search/`, `ai/`, `review/`, `admin/`)
- Do not add a parallel controllers tree for domains that already use route modules

`server/routes/admin.js` remains a thin registry plus remaining admin endpoints; curriculum, jobs, and observability live under `server/routes/admin/`.
