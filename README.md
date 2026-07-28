# Kortumo

Football callups for Colombia — product brand **Kortumo** (mark **K**). Callers create matches; players join via `/{username}`. Working package folder: `call-up/`.

Brand source: [`Brandbook-KORTUMO.pdf`](../Brandbook-KORTUMO.pdf) · [`docs/brand.md`](docs/brand.md)

## Docs (source of truth)

| Doc | Purpose |
|-----|---------|
| [`../constitution.md`](../constitution.md) | Engineering constraints |
| [`../spec.md`](../spec.md) | Product + API contract (§9) |
| [`../plan.md`](../plan.md) | Architecture / brand §0 / Phase 4 UI |
| [`../tasks.md`](../tasks.md) | Implementation tasks (incl. UI 17–21) |
| [`docs/brand.md`](docs/brand.md) | Kortumo palette / type / assets |
| [`docs/api.md`](docs/api.md) | Concise `/api/v1` map |
| [`docs/local-setup.md`](docs/local-setup.md) | Supabase, Google OAuth, VAPID |
| [`docs/coverage.md`](docs/coverage.md) | Domain coverage gate |

**API contract:** always prefer [`spec.md` §9](../spec.md) over this README.

## Setup

```bash
cd call-up
cp .env.example .env.local   # fill values — never commit secrets
npm install
npm run dev
```

See [`docs/local-setup.md`](docs/local-setup.md) for Google OAuth, Supabase schema, and VAPID keys.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm test` | Jest unit tests |
| `npm run test:coverage` | Jest + ≥80% gate on rules/validators/services |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Stack (short)

- **Next.js** App Router (UI + Route Handlers)
- **Supabase** Auth (Google), Postgres, RLS, Realtime `postgres_changes`
- **Zod** validators, Problem Details errors
- **PWA:** Next official `app/manifest` + manual `public/sw.js` (no Serwist / next-pwa)
- **Brand:** Kortumo (K) — navy `#003366`, CTA red `#cc3333`

## Repo layout

```
call-up/                 # this package
  app/api/v1/            # HTTP API
  lib/                   # rules, validators, services, db, notify
  docs/                  # package-local docs
../spec.md               # product + API
../constitution.md
```
