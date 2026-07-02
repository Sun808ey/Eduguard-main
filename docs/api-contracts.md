# EduGuard System API Contracts

This document captures the active backend surface owned by `backend/`.

Related docs:

- [architecture.md](architecture.md) for system ownership and component boundaries.
- [architecture-mdm.md](architecture-mdm.md) for legacy frontend notes.

## Authentication

- `POST /api/auth/login`
  - Request: `username`, `password`
  - Response: `access_token`, `refresh_token`, `role`, `expires_in`
- `POST /api/auth/refresh`
  - Request: `refresh_token`
  - Response: rotated `access_token` and `refresh_token`
- `POST /api/auth/logout`
  - Request: `refresh_token`
  - Response: logout status

## Policies

- `GET /api/policies`
- `GET /api/policies/assigned?device_id=...`
- `GET /api/policies/<policy_id>`
- `POST /api/policies`
- `PUT /api/policies/<policy_id>`
- `DELETE /api/policies/<policy_id>`
- `POST /api/policies/<policy_id>/assign`
- `POST /api/policies/<policy_id>/verify`

## Sync

- `GET /api/sync/pull`
- `POST /api/sync/push`

## Users

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/<user_id>`
- `DELETE /api/users/<user_id>`

## Health

- `GET /api/health`
- `GET /api/data`
- `GET /api/sample-data`

The frontend remains offline-first and can fall back to seeded data when the API is unavailable.