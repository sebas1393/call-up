# Implementation Progress
## Summary
- **Tasks Completed:** 25 / 29 (T22 blocked; T24/T25 human verify; T26 approved)
- **Current Task:** Task 28 — `/` → `/caller` + session persist — **STOP for approval**
- **Time Spent:** ~19.5h
## Task Log
### Task 1–21
- **Status:** Approved
### Task 22 — Brand polish
- **Status:** Blocked (awaiting K vector + Aharoni Bold)
### Task 23 — US-008/009 agile guest enroll
- **Status:** Completed (pending user approval)
### Task 24 — Realtime live roster (§11.7)
- **Status:** Completed in code/docs (pending human verify after `0004`)
### Task 25 — Admin callup UI (US-005)
- **Status:** Completed in code — awaiting approval / human verify
### Task 26 — Admin roster mobile UX + promote
- **Status:** Approved
### Task 27 — Public roster 💵 + Inscribirme + Promoverme
- **Status:** Implemented — awaiting approval
- **Notes:** Anon + logged-in **+ Inscribir** (guest sheet); logged-in **Inscribirme** via subscribe; Promoverme on own waitlist; guests API always userId null again
- **Bugfix:** Public roster — logged-in player can toggle own **💵** (`canPay = owner || self`), not owner-only
- **Bugfix:** Roster order stable by `createdAt` — toggling payment no longer reshuffles positions
- **Bugfix (same cycle):** Admin→other devices Realtime — DELETE sin callup_id se ignoraba; fetches `cache: no-store`; realtime setAuth; soft refresh admin; draft `0005` replica identity (ASK FIRST)
- **Bugfix:** Live UI also refreshes **counts** (7/12→8/12) and **status** (Abierta↔Llena); hook listens to `players`+`callups`; public list, caller dashboard, admin header + roster headers
### Task 28 — Caller `/` → `/caller` redirect
- **Status:** Implemented — awaiting approval / human verify
- **Notes:** `HomeCallerGate` redirects ready callers; CTA checks session before Google; PWA `start_url` `/` (not `/caller` — that forced login)
- **Bugfix:** Session persist — proxy matcher includes `/`; cookie `secure`+`maxAge`; `SessionKeepAlive` client refresh
- **Bugfix:** Callup status Open→Full — `syncCallupStatus` writes via service_role (RLS blocked non-owner updates); GET detail heals stale status
### Task 29 — PWA install CTA (§11.8)
- **Status:** Implemented — awaiting approval / human verify
- **Notes:** `InstallAppPrompt` on `/` + `/{username}`; Chromium `beforeinstallprompt`; iOS Share sheet; session dismiss; hide if standalone
- **Bugfix:** Session persistence — Next.js `proxy.ts` + `updateSession` refreshes Supabase auth cookies (stay logged in until logout)
- **Bugfix:** Install sheet platform-specific (Android Chrome vs iOS Safari); early `beforeinstallprompt` capture
- **Bugfix:** Web Push fan-out wired (`fanOutChannelNotify`) on new_callup / subscribe / unsubscribe / promote / payment / plaza_libre; re-register push when already following
## Rejection Log
### Task 27 (2026-07-30)
- **Rejected:** Self-promote without Inscribirme is incoherent (no way to know “me” on the list).
- **Resolution:** Spec/plan/task revised — anon **Inscribir** (guest); logged-in **Inscribirme** (`POST …/subscribe`); then **Promoverme** when on waitlist. Re-implemented.
### PWA start_url `/caller` (2026-07-30)
- **Rejected / bug:** Manifest `start_url: "/caller"` + `/caller` 401 → Google forced login on every mobile PWA open (skipped home for anon).
- **Resolution:** Documented in **spec US-001 + §11.8**, **plan 11e**, **tasks 15/28/29** — `start_url` MUST be `/`; ready-caller redirect is session-gated after open; unauthenticated `/caller` → `/`.
