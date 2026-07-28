# API map (`/api/v1`)

Contract source of truth: **[`spec.md` §9](../../spec.md)** (request/response shapes, error codes, stories).

This file is a concise inventory of implemented Route Handlers (Tasks 8–12). Success envelope: `{ "data": ... }`. Errors: `application/problem+json` (RFC 7807) with Spanish `detail`.

**Auth levels**

| Level | Meaning |
|-------|---------|
| `anon` | No session required (or one-time OAuth code) |
| `session` | Logged-in user (`supabase.auth.getUser()`) |
| `caller` | Session + `users.user_name` set |
| `owner` | Session user is the callup `caller` (or court `created_by` where noted) |

---

## Auth & profile

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/v1/auth/google` | anon | Start Google OAuth |
| `GET` | `/api/v1/auth/callback` | anon | OAuth callback; upsert user |
| `POST` | `/api/v1/auth/logout` | session | Clear session → `204` |
| `GET` | `/api/v1/me` | session | Self profile only |
| `PATCH` | `/api/v1/me` | session | Update name/phone |
| `POST` | `/api/v1/me/username` | session | Set caller slug once → `201` |
| `POST` | `/api/v1/me/push-subscription` | session | Upsert by `endpoint` → `204` |
| `DELETE` | `/api/v1/me/push-subscription` | session | Delete by `endpoint` → `204` |

## Courts

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/v1/courts?search=` | caller | Global search (min 3 chars). **No** `/courts/mine` |
| `POST` | `/api/v1/courts` | caller | Create + link `caller_courts` |
| `PUT` | `/api/v1/courts/{id}` | createdBy | Edit name/address |
| `POST` | `/api/v1/courts/{id}/link` | caller | Link on select → `204` |

## Callups

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/api/v1/callups` | caller | Create; `waitListThreshold = floor(spots/2)` |
| `GET` | `/api/v1/callups/mine` | caller | Own list; newest first; page size default 10 |
| `GET` | `/api/v1/callups/{id}` | anon | Detail + players (no email/phone) |
| `PUT` | `/api/v1/callups/{id}` | owner | Edit; blocked if `cancelled`/`Closed` |
| `POST` | `/api/v1/callups/{id}/cancel` | owner | → `cancelled` irreversible |
| `PATCH` | `/api/v1/callups/{id}/revalidate-status` | session | CAS status; never clears `cancelled` |

## Players

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/api/v1/callups/{id}/players/subscribe` | session | Join / claim (claim = no channel notify) |
| `POST` | `/api/v1/callups/{id}/players/guests` | session | Crear Jugador |
| `POST` | `/api/v1/callups/{id}/players/me/unsubscribe` | session | Leave → `204` |
| `DELETE` | `/api/v1/callups/{id}/players/{playerId}` | owner | Remove row → `204` |
| `PATCH` | `/api/v1/callups/{id}/players/{playerId}` | owner | Edit name |
| `PATCH` | `/api/v1/callups/{id}/players/{playerId}/payment` | session | Self or owner; guest → owner only |
| `POST` | `/api/v1/callups/{id}/players/{playerId}/promote` | session | Waitlist → roster (owner or self) |

## Caller channel (follow)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/v1/callers/{userName}/follow` | session | `{ following }` |
| `POST` | `/api/v1/callers/{userName}/follow` | session | Seguir; **no self-follow** → `403` |
| `DELETE` | `/api/v1/callers/{userName}/follow` | session | No Seguir → `204` |

---

## Not yet as REST (by design / later tasks)

- Global list of all callups or all users — **forbidden** (spec §10).
- Web Push **send** fan-out (`web-push` + VAPID private) — approved; wire when installing send path (Task 16+).
- Realtime toasts — Supabase `postgres_changes` on client (not custom REST). **Client hook not wired yet.** Until then: Jest covers notify rules (`lib/notify/recipients`); E2E toast asserts come after the hook. See [local-setup.md — Realtime toasts](./local-setup.md#realtime-toasts).

## PWA approach (documented for Task 14/15)

- **Manifest:** Next.js official `app/manifest.ts` (or JSON).
- **Service Worker:** manual `public/sw.js` for `push` + `notificationclick`.
- **Do not use** Serwist or `@ducanh2912/next-pwa`.
- Guide: [Next.js Progressive Web Apps](https://nextjs.org/docs/app/guides/progressive-web-apps).
