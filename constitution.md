#CALL UP PROJECT CONSTITUTION:

## TECH STACK

nextjs FULLSTACK
supabase realtime
common lib for common components
tailwindcss as css handler
postgres / supabase
vercel as host
PWAs reference: https://nextjs.org/docs/app/guides/progressive-web-apps

## ARCHITECTURE PRINCIPLES

nextjs standard path based routes, layered (ui, api, data), clear separation of concerns.
single responsibility for each module

## NEXT JS CONFIGURATION

- use typescript and tsx files
- use path based route for nextjs already installed
- use zod for object validations
- use Jest for testing

# BOUNDARIES

## ALWAYS DO:

- use pragmatic TDD (red -> green -> refactor) for application-layer business logic, api contracts. see TESTING REQUIREMENTS for coverage specifications.
- the whole project must be in english but labels and frontend inputs are in spanish, the app is developed for LatinAmerica.
- use explicit error handling, return standart http error status.
- create custom error pages instead of default ones.
- use async/ await for async server operations.
- clean useeffect hooks dependencies, variables on the callback return func.
-  use Suspense fallbacks loading pages with page skeletons for loading pages, or the ones that depends on db loading (async operations).
- comment BE functions, and bussines logic components, preferred params, resume of the logic and what returns.
- make sure test are passing before move to the next feature.
- After finishing each task, run `pnpm lint` and fix all reported problems before asking for approval or moving on. The app must stay lint-clean (no errors or warnings) at least for linting.
- Always use mobile first design.

## ASK FIRST:

- when Installing new dependencies
- when adding/removing/modifying the DB schema

## NEVER DO:

- Create new projects.
- Never hardcode secrets, API keys, or sensitive data in code
- Never skip writing tests for business logic
- Never use SELECT \* in production code prefer explicit select with necesary fields unless they require all fields.
- Never store passwords in plain text
- Never add features not in spec.md
- Never define hooks inside conditions, always at the top of components.

# CODE STYLE

- use Talwind for css
- folders and components file names always in lowercase e.g. page.tsx, login.tsx.
- Do not leave 'magic numbers' or strings in the code, instead use constants or enums if possible, preffered to avoid variables misspelling
- Prioritize mobile first design
- Use WPA in order to enable users to install the app from the browser on their devices.
- We need to be able to push notifications on the devices please use WPA references to achieve this.

## ERROR HANDLING

- never show stacktrace or error details to user.
- for logging errors use RFC 7807 Problem Details format for logging on BE.
- include traceid for troubleshooting
- for Front end errors, do not show unhandled errors to user, always try catch the error, and show a generic error for unhandled errors: **"Oops, algo salió mal"**.
- for handled errors, use http error codes as per the case, so for not found errors use 4xx codes and define a custom error page for not found pages following nextjs standards.
- return friendly messages to the user **in Spanish**, e.g. **"Oops, no se pudo encontrar el usuario."**
- All user-visible copy (labels, toasts, errors, empty states) must be in Spanish even if internal docs/examples were drafted in English.

## Testing Requirements

### Scope & TDD
- Pragmatic TDD (red → green → refactor) is required for application-layer business logic, domain rules, validators, and API contracts.
- Not required for pure presentational UI, static pages, or styling-only changes.
- Never skip tests for business logic. Do not start the next feature while the canonical test command is red.

### Test pyramid
- Unit (default, Jest): services, rules, validators, mappers. Mock DB, Supabase client, Realtime channels, and external APIs. No real network in unit CI.
- Integration (selective): critical data-access paths against local Postgres/Supabase when repository behavior is non-trivial.
- E2E smoke (Playwright or equivalent): at least one path per major user flow in spec.md (including a guest path and a login-gated path).

### Coverage gate
- Minimum 80% line and branch coverage on application domain actions/services, rules, and validators only.
- Exclude thin pages, generated files, and static assets from the gate.

### Conventions
- File names: *.test.ts / *.test.tsx, colocated with the module or under __tests__/.
- Use AAA: Arrange, Act, Assert. One logical behavior per test.
- Canonical command: npm test (CI must run the same command).

### Realtime, auth & API
- Realtime: unit-test subscription handlers and payload mappers with mocked channels; do not require a live Realtime server in unit tests.
- Auth gates: test that login-required functions reject anonymous callers at the server boundary, and that public guest paths remain accessible.
- API/error contracts: assert HTTP status and Problem Details shape (incl. traceId) for handled failures under test.

### Discipline
- Do not silently skip flaky tests; quarantine with a tracked issue and fix or delete.

# SECURITY

## Auth & access
- Use Google as Auth provider so any user can login / quick register with their Google account; request name and phone from their accounts when available.
- The app is publicly browsable: guests can access it without login.
- Functions are public by default. If login or specific permissions are required, the story/task must say so and list the policies; otherwise treat the function as public.
- Enforce login-required checks on the server (route handlers / Server Actions / data layer), never only in the UI.

## Data protection (RLS)
- Enable Row Level Security (RLS) on user-owned tables so each user can only read/write their own rows (unless a feature explicitly allows shared/public data).
- Never expose the Supabase service-role key to the client; service-role bypasses RLS and is server-only.

## Secrets & input
- Never hardcode secrets, API keys, or sensitive data in code.
- Secrets only in server env; never put private keys in NEXT_PUBLIC_*.
- Validate all untrusted input with Zod at the server boundary; reject oversize or invalid payloads.

## Realtime
- Authorize Realtime channels/subscriptions; respect RLS for postgres_changes; never trust the client alone for access control.
- Open callup UIs that show players **must** subscribe to `postgres_changes` and refresh without manual reload (product requirement; see `spec.md` §11.7). Do not ship fetch-on-mount-only as “done”.

## Logging & PII
- Never log tokens, passwords, Authorization headers, or raw PII.
- Always include traceId in BE error logs (see ERROR HANDLING).
