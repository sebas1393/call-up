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

Tests:

```bash
npm test
npm run test:coverage
```

## PWA (Tasks 15–16)

Planned approach (no Serwist / next-pwa):

1. **`app/manifest.ts`** — `name`, `short_name`, icons 192/512, `display: "standalone"`, `start_url`.
2. **`public/sw.js`** — handle `push` (show notification from JSON `title` / `body` / `url`) and `notificationclick` (focus/open `data.url` or `/`).
3. Client registers `/sw.js`; on **Seguir** success request notification permission and `POST /api/v1/me/push-subscription`.

Until Task 15 lands, the API push-subscription endpoints already exist; the SW/manifest files are the missing install surface.

## Troubleshooting

- **401 on API** — session cookie missing; complete Google login via `/api/v1/auth/google`.
- **403 caller routes** — set username once via `POST /api/v1/me/username`.
- **Revalidate 500** — `SUPABASE_SERVICE_ROLE_KEY` missing/invalid (service client).
- **Self-follow 403** — expected; callers receive owner notifies without following.
