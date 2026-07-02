# EduGuard system — Frontend (eduguard-mdm)

This repository is the frontend for the EduGuard system proof-of-concept MVP.

In production, the app is meant to be deployed to Vercel and pointed at the Flask backend with `VITE_API_BASE_URL`. The dashboard keeps working offline by falling back to seeded data if the backend cannot be reached.

To run the frontend together with the audit API in local development, start the backend on the LAN, then run the React app:

```powershell
cd "c:\Users\SUN\Downloads\Compressed\Eduguard-main\Eduguard-main\eduguard-mdm"
npm install
npm run dev
```

Step 1 completed here: initial project skeleton and placeholder files.

Deployment notes:
- Set `VITE_API_BASE_URL` in Vercel to the HTTPS LAN URL of the Flask backend.
- Keep the backend bound to `0.0.0.0` so clients on the same LAN can reach it.
- If the backend certificate changes, update the trusted cert on the client machine before testing the dashboard.

See the [docs/architecture.md](docs/architecture.md) for high-level notes.

The existing UI contracts and seeded audit data remain unchanged so frontend-only work still has a working fallback when the backend is offline.
