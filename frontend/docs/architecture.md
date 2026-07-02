# EduGuard system — Architecture Notes

This file contains high-level architecture notes for the EduGuard system frontend.

- Landing page (public) and Dashboard (admin) will be React pages.
- Phase 1 uses local mock data; Phase 2 will call Flask API via VITE_API_BASE_URL.
- Routing will use React Router; Dashboard is lazy-loaded.
