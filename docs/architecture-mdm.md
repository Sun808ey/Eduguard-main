# EduGuard system — Architecture Notes

This file contains high-level architecture notes for the EduGuard system frontend.
It is retained as a legacy reference for the archived MDM frontend copy.

Related docs:

- [architecture.md](architecture.md) for current system-wide ownership and architecture.
- [api-contracts.md](api-contracts.md) for active backend API endpoints.

- Landing page (public) and Dashboard (admin) will be React pages.
- Phase 1 uses local mock data; Phase 2 will call Flask API via VITE_API_BASE_URL.
- Routing will use React Router; Dashboard is lazy-loaded.
