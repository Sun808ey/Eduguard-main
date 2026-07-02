# EduGuard Main Repository

This repository now uses a clearer split between the backend and frontend:

- `backend/` contains the Flask backend, tests, and scripts.
- `backend/services/nest-api/` contains a NestJS starter service.
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

The frontend keeps its offline fallback behavior, and the backend continues to serve the app shell in production.

