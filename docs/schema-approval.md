# Schema approval — Call Up

## Status

**Approved to apply** (DDL/RLS reviewed). Apply with `supabase db push` or SQL editor when the Supabase project is ready — do not treat this file as “already applied”.

## Files

| File | Purpose |
|------|---------|
| `supabase/migrations/0001_init.sql` | Tables, indexes, username-immutability trigger |
| `supabase/migrations/0001_rls.sql` | RLS enable + policies per spec §10 |

## What was reviewed

1. Status check: `Open` \| `Full` \| `Closed` \| `cancelled`
2. Self-follow prevented: `CHECK (player_user_id <> caller_user_id)`
3. No global users list (SELECT own row only)
4. Callups readable only when own or caller has a `callup_channels` row (public channel)
5. `push_subscriptions` own-only; fan-out via `service_role` (bypasses RLS)
6. Extra vs conceptual plan: `callup_channels.user_name` denormalized for slug lookup without joining `users`

## How to apply

```bash
supabase db push
# or apply SQL in order: 0001_init.sql then 0001_rls.sql
```

## Approval

- [x] Reviewed DDL
- [x] Reviewed RLS
- [x] Approved to apply by: Sebas bueno — date: 27/07/2026
