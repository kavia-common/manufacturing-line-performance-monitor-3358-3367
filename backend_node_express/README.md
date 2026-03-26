# backend_node_express (Ocean OEE)

Node/Express backend for the Ocean OEE SPA.

## Endpoints (matching frontend client)
- `POST /auth/login` → `{ token, user, role }`
- `GET /auth/me`
- `GET /oee/summary?lineId=LINE-1`
- `GET /oee/trends?lineId=LINE-1&minutes=120`
- `GET /production` / `POST /production`
- `GET /downtime` / `POST /downtime`
- `GET /quality` / `POST /quality`
- `GET /alerts` / `POST /alerts/:id/ack`

## Realtime
- WebSocket: `GET ws://host:port/ws`
  - Server emits JSON messages like `{ type: "oee.update", lineId: "LINE-1", ts: "..." }`
- SSE: `GET /realtime/stream`

## Environment variables
See `.env.example`.
Key values in this project are named `REACT_APP_*` for parity with the frontend deployment wiring.
Also set:
- `JWT_SECRET` (enables JWT auth; if not set the backend runs in demo mode)
