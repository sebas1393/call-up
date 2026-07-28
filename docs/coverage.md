# Domain coverage gate

Constitution requires **≥80% line and branch** coverage on application **rules**, **validators**, and **services** only (not pages or static assets).

## Command

```bash
cd call-up
npm run test:coverage
```

Equivalent: `npm test -- --coverage`.

## Scope (`jest.config.ts`)

**Included**

- `lib/rules/**`
- `lib/validators/**`
- `lib/services/**` (except route/DB orchestration)

**Excluded from the gate**

- `app/**` (including `page.tsx`, `layout.tsx`, `route.ts`)
- `public/**` and other static assets
- `lib/**/index.ts` (barrel re-exports)
- `lib/services/player-routes.ts` (Supabase loaders / route helpers)
- `*.test.ts`

Global `coverageThreshold`: 80% lines, branches, functions, statements.

## Last measured (2026-07-28)

| Metric     | %     |
|------------|-------|
| Statements | 98.11 |
| Branches   | 97.87 |
| Functions  | 100   |
| Lines      | 99.18 |

All 13 suites / 113 tests green with the threshold enforced.
