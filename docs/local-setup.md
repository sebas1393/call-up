# Local setup

Never commit real secrets. Copy env from the template only:

```bash
cd call-up
cp .env.example .env.local
```

Fill values in `.env.local` (gitignored). Reference: [`.env.example`](../.env.example).

## Prerequisites

- Node.js 20+ (Supabase JS may warn for ≥22; pin versions in `package.json` if needed)
- A [Supabase](https://supabase.com) project
- Google Cloud OAuth client (for Supabase Auth → Google)

## Environment variables

| Variable | Where used | Notes |
|----------|------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Anon/public key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypass RLS; revalidate lock / push fan-out. **Never** `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser | Web Push subscribe (`pushManager.subscribe`) |
| `VAPID_PRIVATE_KEY` | Server only | Web Push send (when wired) |
| `VAPID_SUBJECT` | Server | e.g. `mailto:you@example.com` |

Generate VAPID keys (example):

```bash
npx web-push generate-vapid-keys
```

Put the **public** key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the **private** key in `VAPID_PRIVATE_KEY`. Do not expose the private key to the client.

## Supabase

1. Create a project and copy URL + anon key + service role key into `.env.local`.
2. Apply SQL drafts under `supabase/migrations/` (`0001_init.sql`, `0001_rls.sql`) when ready — schema apply was approved in product docs; run via Supabase SQL editor or CLI when you have a project.
3. Enable **Google** provider under Authentication → Providers.
4. Set Auth redirect URLs to include your app callback, e.g.  
   `http://localhost:3000/api/v1/auth/callback`  
   (and production URL when deployed).

## Google OAuth

1. In Google Cloud Console, create an OAuth 2.0 Client (Web).
2. Authorized redirect URI must match **Supabase** callback URL (from Supabase Auth → Google settings), not only the Next route.
3. Paste Client ID / Secret into the Supabase Google provider form.
4. App entry: `GET /api/v1/auth/google` (optional `redirectTo`, `intent=caller|player`).

## Run

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
npm run test:coverage
```

### Realtime live UI (MUST)

Open callup screens **must** update player lists/counts via Supabase **`postgres_changes`** without manual refresh (spec §11.7). This is **not** optional toast polish.

1. Apply `supabase/migrations/0004_realtime_publication.sql` (adds `players` + `callups` to `supabase_realtime`), **or** Dashboard → Database → Publications → enable those tables.
2. Client: `createBrowserClient` + `useCallupPlayersRealtime` on `/{username}` and expanded roster (`PlayerRoster`).
3. Verify: two browsers/devices on the same callup → **Inscribir** on A appears on B without reload.

### Realtime toasts (push copy when app open)

Toasts on top of live refresh (Spanish event copy). Test layers:

| Layer | What | How |
|-------|------|-----|
| **A** | Business rules (who gets notified, noise window, claim silent) | Jest on `lib/notify/recipients` — no WebSocket |
| **B** | Client helpers | Jest on `lib/realtime/callup-players-events`; mock channel in hook tests |
| **C** | E2E (optional) | Playwright two sessions; publication must be on |

Do **not** put live WebSocket integration in unit Jest — flaky and slow.

## PWA (Tasks 15–16)

Approach (no Serwist / next-pwa) — see [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps):

1. **`app/manifest.ts`** — `name`, `short_name`, icons 192/512, `display: "standalone"`, `start_url` (**Task 15 done**).
2. **`public/sw.js`** — `push` shows notification from JSON (`title`, `body`, `url`); `notificationclick` focuses/opens `data.url` or `/` (**Task 15 done**).
3. **Task 16:** client registers `/sw.js`; on **Seguir** success request notification permission and `POST /api/v1/me/push-subscription`.

## Troubleshooting

- **Public `/{username}` shows zero callups while `/caller` has some** — anon could not SELECT `courts`; nested `courts!inner` dropped rows. Apply `0003_courts_anon_select.sql` (or re-run updated `0001_rls.sql` courts policies).
- **Two devices: Inscribir only visible after refresh** — Realtime not published and/or no client `postgres_changes` subscription. Apply `0004_realtime_publication.sql` and confirm `useCallupPlayersRealtime` is mounted (spec §11.7).
- **`cannot add postgres_changes callbacks … after subscribe()`** — two hooks reused the same Realtime channel topic on the singleton browser client (e.g. list + roster with one callup id). Fixed by unique topic per hook instance (`useId`); hard-refresh if an old bundle is cached.
- **401 on API** — session cookie missing; complete Google login via `/api/v1/auth/google`.
- **403 caller routes** — set username once via `POST /api/v1/me/username`.
- **Revalidate 500** — `SUPABASE_SERVICE_ROLE_KEY` missing/invalid (service client).
- **Self-follow 403** — expected; callers receive owner notifies without following.
