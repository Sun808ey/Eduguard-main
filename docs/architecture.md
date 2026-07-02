# EduGuard System — Architecture Notes

This repository now follows a split ownership model:

- `frontend/` owns public UI, routing, styling, and offline fallback behavior.
- `backend/` owns enforcement, persistence, validation, and server-side rendering of the app shell.
- `docs/` owns architecture notes and API contracts.

Frontend behavior:

- Landing, login, dashboard, and enrollment routes are implemented in React.
- The frontend keeps a seeded offline fallback and can switch to `VITE_API_BASE_URL` later without changing route contracts.
- React Router handles application navigation and lazy-loading of larger dashboard views.

Backend behavior:

- Flask serves the app shell, static assets, health endpoints, and API routes.
- Security-sensitive flows remain in the backend package, including auth, policy encryption/signing, sync validation, and audit logging.

See [api-contracts.md](api-contracts.md) for the active backend endpoint surface.
