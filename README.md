# EduGuard Main Repository

This repository now uses a clearer split between the backend and frontend:

- `backend/` contains the Flask backend, tests, and scripts.
- `frontend/` contains the React/Vite frontend and static web assets.
- `docs/` contains shared architecture notes and API contracts.
- `eduguard-api/` is a separate NestJS starter project and is not the active backend.

Run the backend and frontend from their own roots:

```powershell
cd "c:\Users\SUN\Downloads\Compressed\Eduguard-main\Eduguard-main"
python -m pytest backend/tests/test_smoke.py

cd "c:\Users\SUN\Downloads\Compressed\Eduguard-main\Eduguard-main\frontend"
npm install
npm run dev
```

The frontend keeps its offline fallback behavior, and the backend continues to serve the app shell in production.

