# EduGuard Main Repository

This repository now uses a clearer split between the backend and frontend:

PROJECT TITLE: DEVELOPING AN ANDROID OFFLINE-FIRST SCHOOL-OWNED PHONE USE POLICY ENFORCEMENT SYSTEM FOR EDUCATION IN UGANDAN SECONDARY SCHOOLS. A LOCAL CONTEXT-BASED PROOF OF CONCEPT MVP FOR THE AWARD OF BACHELOR OF SCIENCE IN COMPUTER SECURITY AND FORENSICS.

- `backend/` contains the Flask backend, tests, and scripts.
- `backend/services/nest-api/` is a non-primary sidecar/archive starter service and is not the active enforcement backend.
- `frontend/` contains the React/Vite frontend and static web assets.
- `frontend/apps/mdm-legacy/` keeps the legacy frontend copy for rollback-safe transition.
- `docs/` contains shared architecture notes and API contracts.

Central documentation:

- `docs/architecture.md`
- `docs/api-contracts.md`
- `docs/architecture-mdm.md`

Run the backend and frontend from their own roots:

```powershell
cd "c:\Users\SUN\Downloads\Compressed\Eduguard-main\Eduguard-main"
python -m pytest backend/tests/test_smoke.py

cd "c:\Users\SUN\Downloads\Compressed\Eduguard-main\Eduguard-main\frontend"
npm install
npm run dev
```

The frontend keeps its offline fallback behavior. For the migration path, the backend is intended to move to Render with PostgreSQL (Neon), and the frontend should be treated as a separate deployment target.

Backend deployment contract for the next migration step:
- Target runtime: Flask on Render with Gunicorn.
- Target database: Neon PostgreSQL.
- Required backend env vars: `FLASK_SECRET_KEY`, `JWT_SECRET`, `DATABASE_URL`, `VERCEL_ENV`.
- Keep the current API behavior stable during setup; do not change database semantics in this step.

