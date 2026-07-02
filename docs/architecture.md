# EduGuard System — Architecture Notes

This repository now follows a split ownership model:

- `frontend/` owns public UI, routing, styling, and offline fallback behavior.
- `backend/` owns enforcement, persistence, validation, and server-side rendering of the app shell.
- `docs/` owns architecture notes and API contracts.

Canonical documentation in this folder:

- [architecture.md](architecture.md) - system-level architecture and ownership boundaries.
- [api-contracts.md](api-contracts.md) - active backend endpoint surface.
- [architecture-mdm.md](architecture-mdm.md) - legacy MDM/frontend architecture notes.

Frontend behavior:

- Landing, login, dashboard, and enrollment routes are implemented in React.
- The frontend keeps a seeded offline fallback and can switch to `VITE_API_BASE_URL` later without changing route contracts.
- React Router handles application navigation and lazy-loading of larger dashboard views.

Backend behavior:

- Flask serves the app shell, static assets, health endpoints, and API routes.
- Security-sensitive flows remain in the backend package, including auth, policy encryption/signing, sync validation, and audit logging.

See [api-contracts.md](api-contracts.md) for endpoint details and [architecture-mdm.md](architecture-mdm.md) for legacy frontend notes.
