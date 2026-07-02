# EduGuard System — Architecture Notes

PROJECT TITLE: DEVELOPING AN ANDROID OFFLINE-FIRST SCHOOL-OWNED PHONE USE POLICY ENFORCEMENT SYSTEM FOR EDUCATION IN UGANDAN SECONDARY SCHOOLS. A LOCAL CONTEXT-BASED PROOF OF CONCEPT MVP FOR THE AWARD OF BACHELOR OF SCIENCE IN COMPUTER SECURITY AND FORENSICS.

This repository now follows a split ownership model:

- `frontend/` owns public UI, routing, styling, and offline fallback behavior.
- `backend/` owns enforcement, persistence, validation, and server-side rendering of the app shell.
- `backend/services/nest-api/` is maintained as a non-primary sidecar/archive starter and does not replace the active Flask backend.
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
