# Call Up Specification
## 1. Overview
**Problem Statement: ** Football players need a way to make a callup to play on specific date, this is the actual process via Whatsapp: 

call up: 
the caller will configure the callup with the following configurations: 
- list with fixed positions depending on the type of the court, if F6 there are 12 spots if F5 only 10.
- type of court
- match datetime with the format dd MM hh:mmT
- Place (name of the court) or location.
- llave (key for payment) it is a string.

it can configure several dates at once. eg: (WhatsApp today; **MVP app: one callup per create submit** — see Out of scope)

⚽️💪🏻🎉 CANCHA F6 MIÉRCOLES 22 JULIO 8:00PM CANCHA VECIGOL 🎉⚽️💪🏻

  🎉⚽️ 8PM 8PM 8PM⚽️
  1.Pablo💵
2.⁠Jeshua
3.
4.⁠ 
5.
6.⁠ 
7.⁠ ⁠⁠ 
 8.  
 9. 
10. 
11.
12.

En espera:

1. 

Valor por persona: 12.500

Llave: @vitola96002
  

⚽️⚽️⚽️⚽️⚽️⚽️⚽️⚽️⚽️⚽️

⚽️💪🏻🎉 CANCHA F6 JUEVES  23 JULIO 8:00PM CANCHA VECIGOL 🎉⚽️💪🏻

  🎉⚽️ 8PM 8PM 8PM⚽️🎉
1.⁠  Pablo Vitola 💵
2.⁠ Brayan Olmos💵
3.
4.
5.⁠ 
6.⁠ 
7.⁠ 
8.
9.
10. 
11.
12.

En espera:

1. 

Valor por persona: 12.500

Llave: @vitola96002


**Target Users: ** footbal players, two roles:
- caller who create the callup
- players that can see the available callups and can subscribe himselfs to it.
- Users: callers and players logged on the app.

**Success factors: **
- Caller can create, edit, cancel the callup.
- when caller creates the callup, they can optionally check **“Subscribirme a la convocatoria”** to join the roster themselves; if unchecked, roster starts empty (caller not auto-added).
- caller can share the link to his callup specific account so players can see the callup(s) available.
- player can subscribe to the callup available.
- players need to see the subscriptions on realtime, to avoid overriding or dirty lectures, no one can delete other player (only the caller).
- when spots are full, players that want to subscribe, will be notified that spots are full, but the can subscribe to the waiting list.

under the hood: waitlist threshold is **floor(spots/2)** at **create time**, stored once, **not recalculated** if spots change later. No UI field for threshold.

## 2. User Stories:

### US-001: Home Page:
**As a**: public non authenticate user
**I want**: to see an informative landing page with the product purpose and two clear role CTAs.
**So that**: I can choose my role and continue (Caller → US-002; Player → US-008).

**Acceptance Criteria**: 
- Hero image required.
- Landing explains the problem/solution at a high level (realtime callups / avoid WhatsApp override chaos).
- **Reports / match statistics / result records**: **Coming soon** (future version) — UI may show “Próximamente”; **not** in MVP and **not** required for automated tests.
- **Home role CTAs (labels ES — home only):**
  - Primary (red): **Creador de Convocatoria (Caller)** → US-002. **Before starting Google OAuth**, check for an existing session (`GET /api/v1/me`):
    - Ready caller (profile complete + `userName`) → go to **`/caller`** (no re-login).
    - Session but profile incomplete → `/complete-profile`.
    - Session, profile complete, but no `userName` → `/complete-caller-username`.
    - No session → Google OAuth with `intent=caller` and `redirectTo=/caller`.
  - Secondary (outline): **Soy jugador** → US-008 (`/player`).
- **Touch / mobile CTA chrome (MUST):** role buttons must not look “thin” on small screens. Use **min-height ≥ 56px** (`min-h-14`), **vertical padding ≥ 14px** (`py-3.5`), horizontal padding ≥ 20px, **full width** in the mobile column stack, `leading-snug` so multi-line labels (e.g. Creador…) keep comfortable tap targets. Prefer `min-h-*` + `py-*` over a fixed short `h-12` that clips padding when text wraps.
- Role CTAs navigate: Caller path → US-002; Player → US-008 (caller username form is on `/player`, not on the landing beyond the Player button).
- **Logged-in caller → dashboard (MUST):** if the visitor already has a session and is a **caller ready to manage callups** (profile complete **and** `userName` set), opening **`/` (home/landing) must redirect to `/caller`** (US-004 callup dashboard) — **not** keep them on the marketing landing. Incomplete profile → `/complete-profile`; caller without slug → `/complete-caller-username`. Anonymous / player-only sessions may still see home. Sign-out still lands on `/` (US-002).
- **PWA `start_url` (MUST):** `app/manifest.ts` **`start_url` MUST be `/`** (home). Ready-caller redirect to `/caller` is **client/session-gated** after open — **never** set `start_url` to `/caller`. Anti-pattern (regressed 2026-07-30): `start_url: "/caller"` + `/caller` 401 → Google OAuth made every cold PWA open force login and skip the landing for anon/players.
- **Testing**: no dedicated deep E2E for US-001; optional smoke that landing renders and both CTAs navigate. Flows are covered under US-002 / US-008.
**Changed (2026-07-30):** home primary CTA label → “Creador de Convocatoria (Caller)”; mobile CTA min-height/padding rules added so regeneration of UI tasks keeps tappable buttons.
**Changed (2026-07-30):** authenticated ready caller visiting `/` → redirect to `/caller` (dashboard), not home.

### US-002: Caller Role:
**As a**: public non authenticate user
**When I**: choose the caller option on the home page, **first check for an existing session** (do not force Google every time). If already a ready caller → `/caller`. If session needs profile/username completion → those screens. Only if there is no session → authenticate/register with Google. Name, profile picture and phone are required. **UserName slug is required in this flow** (unique, no spaces, placeholder `juanbueno`) before I can create callups. After auth/profile, I would be redirected to Caller page specified in US-004 (**`/caller`** — callup dashboard). **Default post-login destination for caller intent is `/caller`, never `/`.** If I later open the home URL while still logged in as a ready caller, redirect to `/caller` (see US-001). After login, on the header at the top-right I want to see my name (taken from the google account data) and picture. if clicked I want to see the sign-out option, if clicked session must be cleared and be redirected to the home page.
**So that**: I can start creating callups as an authenticated caller.
**Restrictions**: see US-010
**Changed (2026-07-30):** caller session must land on / stay on dashboard (`/caller`), not home landing.


### US-003a: Create Call Up:
**As a**: caller
**I want**: to create a call up with the following criteria:
- On the callups list a button  **+ Create** (label = Crear) so I will be redirected to a form with the following fields:
- Court (label=Cancha): Dropdown with the courts configured to play. and a search button/input that allow me to search the court name or address(fullsearch).
    - if the court is not on the list, a + Create button (label: Crear cancha) that show me a pop up to create the court (court Creation is specified on **US-003b**)
- type of court (label= tipo de cancha): posible types: F6 - F5 (depending on the type will vary the quantity 12 - 10 respectively) (editable)
- spots quantity (label=plazas): default **10 (F5)** or **12 (F6)**; caller may change this value **at create time** (custom plazas allowed then). After create, editable only under US-006 rules.
- waitlist (label=aceptar lista de espera?): boolean, caller can configure to allow waitlist after the callup is full. (not editable after create)
- match datetime (label: fecha del cotejo): calendar with date and hour, show it with the format dd MM hh:mmT. Timezone: **America/Bogota** only (pilot; international TZ later if needed). Past datetimes are not allowed.
- llave (key for payment [string max 50]) **required**; no spaces; letters/digits and **email-allowed special characters only** (e.g. `@ . _ + -` and other chars valid in an email address). May be alphanumeric, a phone-like number, or an email — max 50.
- **Subscribirme a la convocatoria** (checkbox): if checked on create, insert the caller into the roster (`UserId` + name, `HasPayment=false`). If unchecked, do not add the caller.

**Rules for spots**:
- if type is changed from F5 to F6 => spots quantity can be augmented accordingly because there are more spots. WaitListThreshold does **not** recalculate (keeps value from create).
- if type is changed to a smaller court, it must be checked that spots are greater than or equal to roster subscribed users (not counting waitlist); if not, change cannot be made.

### US-003b: Create Court:
**As a**: caller
**I want to**: Create a court with the following fields:
- Place (label= nombre de la cancha [string max 100]): name of the court
- Address (label= direccion[string max 100]): court address.
- buttons to cancel/create the court
- to avoid duplicates on inserting the name please normalize all names to trimmed UPPERCASE also one space between words and no spaces at start or end
- courts with the same name should not be allowed.
- after save, court dropdown must be updated and preselected with the new court. 
- when caller search name or address of the court, search is global; if a court matches, caller can **select** it → client calls link endpoint and BE creates `caller_courts` for that caller (**on select**, not on search alone).
**So that**: I can select the court on the callup creation.
**Is Acceptable**: - that courts are duplicated like "VECIGOL" vs "DECIGOL" vs "EL VECIGOL"
**Edit rules**: Only the user in `CreatedBy` can edit the court **Name** and **Address**. Callers who only linked via `Caller_Courts` can select/use it, not mutate it.

### US-004: Caller dashboard:
**As a** caller
**I want to**: List all the callups that i have created, this page need to be paginated, by 10 rows ordered by the newest callup to the oldest callup with the following fields:
so the view must be made for mobile, so we should organize callups by date, and when click on the date we can see the other details eg.
**callup (label=Convocatorias:)**
Full example:
> 22 de Julio 8:00 pm | llena | 12 / 12  
> 1 de Agosto 9:00 pm | abierta | 7 / 12  | Subscribirme
Open example
▼ 22 de Julio 8:00 pm | llena | 12 / 12 
    - Cancha: Vecigol / Clle 20 # xxx 
    - Llave/nequi: @llave123 📋(copy icon)
    **jugadores**  + Crear Jugador
    Nombre                           | 💵
    (onClick=manage)1 Sebas bueno  |  ✅(mark unmark)  
    (onClick=manage)2 Pepe         |  ❎
    
    (icon)manage (icon)edit (icon)cancelar


- Date of the callup: dates in the past are not allowed; interpret/compare in **America/Bogota**.
- plazas(total/inscritos): eg. 7 / 12 (meaning that there are 12 spots, 7 has been taken on roster; waitlist separate)
- **Status enum (source of truth):** `Open` | `Full` | `Closed` | `cancelled`
    - **Open** (label: **Abierta**): default on create; there is still subscribe capacity (free roster spot **or** waitlist capacity under threshold). Roster may be full while waitlist still has room — status stays **Open**.
    - **Full** (label: **Llena**): **no** subscribe capacity left — roster is full **and** (waitlist off **or** waitlist at threshold). Match datetime still in the future. Not the same as Closed.
        - If a roster spot frees (unsubscribe/remove) or capacity returns (e.g. spots increased): BE sets status back to **Open**; followers get **plaza libre** / Realtime.
        - While `Full`: no new subscribe / Crear Jugador. Unsubscribe/remove, promote (only if a roster spot is free — normally after someone leaves), edit callup (US-006), and payment toggles remain as otherwise allowed.
    - **Closed** (label: **Cerrada**): **only** because match datetime is past (Bogotá). Irreversible for that match time — does **not** reopen. **Read-only** except **HasPayment** (own payment if `UserId`; caller any row). No subscribe, unsubscribe, Crear Jugador, promote, edit callup, or edit/remove player names.
    - **cancelled** (label: **Cancelada**): logical cancel by caller. **Irreversible**. Fully **read-only** (including payment). View only; create a new callup to play again.
- **Revalidate:** UI may hint `Full` or `Closed` from on-screen data while status is `Open` (or hint `Closed` when date passed); client calls revalidate; **only first lock holder** runs BE check; UI does not write status — BE updates DB.
- **Subscribe eligibility (source of truth — not Status alone, but Status must stay consistent):**
  - Allowed if free **roster** spot **or** (waitlist enabled and under threshold).
  - Not allowed if roster full **and** (waitlist off **or** at threshold) → status should be **Full**.
  - Blocked entirely when status is **Closed** or **cancelled**.
  - On unsubscribe/remove that frees a roster spot (date still future): BE sets **Open** if it was **Full** (or keeps Open); channel **plaza libre**.
- Actions (only when not `cancelled` and not `Closed` for mutating actions except HasPayment on `Closed`): manage(label: administrar US-005) edit(label: modificar US-006) with pencil icon, cancel(label: cancelar) with trash icon, when clicked, show a pop-up to confirm the action (cancel = logical cancel, not hard delete). Edit allowed while **Open** or **Full**.
- From the caller dashboard / expanded callup, the **caller can subscribe themselves** or **subscribe others** (Crear Jugador), same roster/waitlist rules as players (not when Full / Closed / cancelled).
- for now we will show paginated all the callups without any disctintion if their status, later one we can discuss more optimizations.
**So that**: I can see the list of callups I have made.

### US-005 Admin Callup:
**As a** caller
**I want to**: Manage a callup (**Administrar** from US-004 dashboard), so i can see the list of players subscribed to the callup.

**Route:** `/callups/{id}` (or `/callups/{id}/admin`) — owner-only manage screen; **Close** (**Cerrar**) returns to `/caller`. Dashboard link **Administrar** must open this screen (not 404).

**Player list — admin columns (MUST, mobile-first):**
- **Nombre** (text header): player display name. Names **must truncate / ellipsis** so the three fixed action columns stay visible without widening the viewport (no horizontal page growth on phones, e.g. iPhone 15).
- **Do not** use the text header **Ya pagó** on this admin table (same as public lists: payment column is symbol-led). Use **three symbol column headers** (fixed width, right-aligned action cluster):
  1. **💵** — payment column (row control: unpaid = **red ✕**, paid = teal/positive **✓**; toggle on change, no edit mode required).
  2. **Edit icon** (same pencil glyph already used in product) — opens inline name edit (input + Guardar / Cancelar).
  3. **Delete icon** (same trash glyph already used in product) — removes the player (confirm if already required elsewhere).
- Layout goal: one compact row on a ~390px-wide phone; actions never push the page wider than the content column.

**Add player (Inscribir / Crear Jugador):**
- **+ Inscribir** at the top of the list (label align with US-009).
- **MUST NOT** expand an inline form that reflows / resizes the roster list in a way that feels jumpy on mobile. Prefer a **stable overlay** (bottom sheet / modal / portal) so opening Inscribir does not grow the scrollable list height or shift the page layout.
- **Viewport / layout jump (MUST):** on iPhone, the “automatic zoom” happens when the **Inscribir** or **edit name** form **opens**, not when focusing. Typical cause: the form (or its padding/margins/children) **exceeds the viewport width**, so the page grows horizontally and Safari keeps that scale after close.
  - Form UI must stay **within viewport width** at all times: `width: 100%`, `max-width: 100%` (avoid `100vw` if it includes safe-area/scrollbar overflow), `box-sizing: border-box`, and `min-width: 0` on flex/grid children.
  - Prefer **overlay / bottom sheet / portal** for Inscribir (and optionally for edit) so the roster list does **not** reflow or grow in height; sheet content must also be width-contained.
  - On close: restore `body` scroll lock and ensure no leftover horizontal scroll (`overflow-x: hidden` on the admin page column is OK).
  - Optional secondary hygiene: name inputs **≥ 16px** font to also avoid Safari’s separate focus-zoom behavior. Do **not** use `user-scalable=no` / locked `maximum-scale` as the primary fix (accessibility).

**Crear Jugador when roster is full**:
- Roster full + waitlist enabled + waitlist under threshold → confirm (ES): **“Lista llena, ¿deseas suscribirte a la lista de espera?”** Sí → guest/player row with `IsWaitList=true`. No → no insert.
- Roster full + waitlist enabled + waitlist at threshold → **“Lista llena. Te avisaremos si se desocupa una plaza.”** No insert.
- Roster full + waitlist disabled → lista llena only (no waitlist offer).

**Promote waitlist → roster (MUST for caller on Administrar):**
- While status allows churn (`Open` / `Full` with a free roster spot) and the player is on waitlist, the caller **must** be able to move that player to the roster (same `POST …/promote` contract: `IsWaitList=false`, `HasPayment=false`).
- Control must be visible and usable on the waitlist section of this admin UI (not only documented in API). Blocked when `Closed` / `cancelled` or when roster has no free spot.

**Other row actions:** add / edit name / remove / payment as above; blocked when `cancelled` / `Closed` except **HasPayment** allowed on `Closed`.

I need a close button to go back to the callup dashboard.
**So that**: I can manage the callup list on a phone without layout jump, and move waitlisted players into the roster when a spot is free.
**Changed (2026-07-30):** Administrar route.
**Changed (2026-07-30 — admin mobile UX):** admin headers = Nombre + 💵 / edit / delete symbols; truncate names; Inscribir via overlay (no list reflow); **forms must not exceed viewport width** when opened; caller promote waitlist→roster required on this screen.
**Changed (2026-07-30 — payment header):** player-facing lists also use **💵** instead of text **Ya pagó** (see US-009).

### US-006: Edit Callup: 
**As a** caller
**I want to**: Edit the callup fields defined in **US-003a** (and court via **US-003b** when changing cancha).
**Field reference (source of truth = US-003a)**:
- Court (Cancha) — searchable; create new via US-003b
- type of court (F5/F6) — editable; spots rules in US-003a
- spots quantity (plazas) — editable with restriction below; WaitListThreshold does not recalculate
- waitlist boolean — **not editable after create** (US-003a)
- match datetime — America/Bogota; no past dates
- llave (PaymentKey) — required; max 50; no spaces; letters/digits + email-allowed specials only (see US-003a)
**So that**: i can edit the callup.
**restrictions**:
- caller cannot update spots less than the roster subscribed players.
- Edit allowed while **Open** or **Full**. **Not** allowed when **cancelled** or **Closed** (past date).
- Spot/type change rules: see US-003a “Rules for spots”. If increasing spots restores capacity while `Full`, BE sets status to **Open**.
- At create, plazas default to 10 (F5) or 12 (F6); caller may set a custom value at creation.

### US-007: Caller Account Links: 
**As a**: caller
**I want**: to share with my players the link for each callup
General link:
I can attach the callups to my general link that is:
http://mydomain.com/{friendly-caller-account}
**Acceptance criteria**: The link must be unique per caller, and friendly for users, it can be configurable for the caller so:
- path = the path of the app
- user = configurable, so the caller can edit this part, but only once, at the register step.

### US-008: Player Role from home page:
**As a**: public non-authenticated user
**When I**: choose the player role, I am asked for the **caller username** (slug only — no spaces, no full URL).
- Label (ES): **Usuario del caller** (not “nombre de la convocatoria”).
- Placeholder example: `juanbueno`
- Helper text (ES): ej. `juanbueno` — solo el usuario, sin espacios ni enlace completo.
- On submit: **navigate directly** to that caller’s callup list (`/{username}`). **Do not** prompt Google login on this step (MVP agility).
- Enrollment: **anon → Inscribir** (guest); **logged-in → Inscribirme** (see US-009). No Google required to open the channel.
- Player may still log in later (e.g. Seguir channel US-011); a callup can only be owned by one caller.
**So that** I can open the caller’s list quickly and enroll without friction.
**Restrictions**: see US-010 (login still required for caller actions / Seguir).
**Validation**: accept only slug pattern `[a-z0-9-]{5,10}`; reject URLs and values with spaces; show Spanish error if not found.
**Changed (2026-07-30):** removed mandatory Google login before `/{username}`; guest enroll is the default path (US-009).

### US-009: Player Subscription:
**As a**: Player (authenticated **or** anonymous)
**When I**: open the link shared by the caller (`/{username}`), I want to see the list of callups of the caller, with the following fields:

**callup (label=Convocatorias:)**
Full example:
> 22 de Julio 8:00 pm | llena | 12 / 12  
> 1 de Agosto 9:00 pm | abierta | 7 / 12 | Inscribir / Inscribirme
Open example
▼ 22 de Julio 8:00 pm | llena | 12 / 12 
    - Cancha: Vecigol / Clle 20 # xxx 
    - Llave/nequi: @llave123 📋(copy icon)
    **jugadores** + **Inscribir** or **Inscribirme**
    Nombre                           | 💵
    1 Sebas bueno                    |  ✓ (teal)  
    2 Pepe                           |  ✕ (red)

**Player list column headers (ES, MUST):**
- **Public channel / player view (US-009):** **Nombre** | **💵** (not the text “Ya pagó”). Unpaid control = **red ✕**; paid = teal/positive **✓**. Truncate long names on narrow phones so the payment column stays visible.
- **Caller Administrar (US-005):** **Nombre** + symbol headers **💵** | edit icon | delete icon. Truncate names; Inscribir/edit in overlay; **forms must not exceed viewport width** — see US-005.

**Inscribir form layout (MUST, public channel):** same width rule as US-005 — opening Inscribir must not exceed viewport width or reflow the list; use overlay/sheet with `w-full` / `max-w-full` / `min-w-0`.


**Enroll model (MUST):**
- **Anonymous:** **Inscribir** — name-only guest row (`userId` null). No Google gate. Waitlist confirm as below.
- **Logged-in (session, not already on this callup):** **Inscribirme** — self-subscribe with profile name + `userId = me` via `POST …/players/subscribe` (claim guest by normalized name if match, else create). **No name form** required (uses profile `name`). Same roster/waitlist eligibility and waitlist confirm. One row per userId per callup.
- **Logged-in can also add others:** **+ Inscribir** stays available (same guest name sheet as anon) whenever Subscribe eligibility is met — even if the user is already on the callup. Guest row always `userId` null.
- If session user is already on the callup: hide Inscribirme; keep **+ Inscribir** when eligible; show **Promoverme** when on waitlist and a roster spot is free.
- Caller admin (US-005) **Inscribir** remains guest (`userId` null) for adding others.
- Payment toggles for guest rows: **caller-only**. Own payment if `userId === me` as otherwise allowed.
- **Live roster (MUST):** §11.7 — `postgres_changes`; no refresh-only.

- Actions
    - **Inscribir** (guest, anon or logged-in): enabled when Subscribe eligibility is met. Collect **nombre**. Guest row (`userId` null). Waitlist confirm / full messages as before. Race → `409`.
    - **Inscribirme** (logged-in self): enabled when eligibility met and user not already on callup. Uses session profile name + `userId`. Waitlist confirm if needed. Race → `409`. Shown alongside **+ Inscribir** when both apply.
    - **Self unsubscribe:** may remain limited in MVP; caller can remove (US-005).
    - Spot free + waitlist: notify plaza libre; **manual promote**:
      - Caller promotes any waitlisted row (US-005).
      - **Logged-in self-promote (MUST):** own waitlist row (`userId === me`) → **Promoverme** on public list when roster has a free spot.
      - Guests cannot self-promote.
      - FIFO on last spot; on promote `IsWaitList=false`, `HasPayment=false`.
**Changed (2026-07-30):** public payment header **💵**; Inscribir (anon) + **Inscribirme** (logged-in); self-promote only after Inscribirme creates `userId` row; Inscribir form must not exceed viewport width.

Players on the public channel cannot admin/edit other players or the callup. Payment for guest rows: **caller only**.

**Acceptance Criteria**
- Anon can **Inscribir** by name when eligibility allows (no login).
- Logged-in user sees **Inscribirme** when eligible and not already enrolled, and **+ Inscribir** to add other players by name whenever eligibility allows.
- Guest rows unique by normalized name; session users unique by `userId` per callup.
- Live updates per §11.7.
- Self-promote (**Promoverme**) when `userId === me` on waitlist and roster spot free.

**Restrictions**: see US-010  
**Changed (2026-07-30):** restored **Inscribirme** for logged-in players; anon keeps guest **Inscribir**; no Google required to open `/{username}`.

## US-010: User Profile: 
**As a**: User (Player/caller)
**I want to**: be able to modify my name/phone on profile page, when click on my profile picture / name at the top of the page, it shows an option above logout called profile, it should show me a pop-up to edit fields. Name/email/phone are mandatory and should be pulled when I register from google; if not available, a non-avoidable profile pop-up must block until filled.
**Acceptance Criteria**:
- name/email/phone are mandatory pulled from gmail.
    - phone: validate as string of exactly 10 CO digits (no +57). **Persist digits only**. BE helper formats for display as `+57 310 222 2222` (profile UI only; never on public callup screens).
- **UserName (slug)**:
    - Must be **unique** when set. Pattern `[a-z0-9-]`, min 5, max 10, **no spaces**. Placeholder example: `juanbueno`.
    - **Mandatory only to act as caller** (required before creating callups / owning `/{username}`). Set once (immutable after save — US-007).
    - **Not required** for player-only actions (open link, subscribe, waitlist, follow channel, own payment).
- if name/email/phone are not provided, pop-up should be a blocker until fulfilled.


## US-011: Subscription to a caller chanel
**As a**: Player
**I want to**: be notified when a callup from a known caller has been opened or created, so I want to subscribe to the caller callups, so when I am on the specific link of a caller, on the callups list, I want a button to subscribe to this callups account, so I will be notified whenever this caller create/open a new callup.

**Channel model (WhatsApp-like)**:
- Subscribing is to the **caller channel** (`Player_Subscriptions` / `Callup_Channel`), **not** when expanding a callup row in the UI.
- UI (ES): quiet text control (not a primary button) — e.g. **“Suscríbete al canal de {username} para recibir actualizaciones de las convocatorias”** when not following; when following, short status + **Dejar de seguir**. Place under the channel title beside / below install link; must stay clearly clickable but secondary to the callup list.
- **No self-follow:** a caller **cannot** follow their own channel (`403` / reject). They still **receive callup notifications as owner** (roster churn on their callups) without following — see §11 recipients.
- Channel notification events to **all followers** (+ **caller/owner** for their callups): **new callup**, **subscribe**, **unsubscribe**, **plaza libre**, **promote**.
- Delivery: **Web Push when the PWA is in background**; **Realtime toast when the app is open** (both for plaza libre and other channel events as applicable).
- **Install / Home Screen:** see §11.8 — CTA **Instalar app** (Android prompt / iOS Share instructions). Needed on iOS for background push after **Seguir**.
- **Noise window (intentional):** while a callup is **Open**, channel events stay relatively noisy so followers stay aware. Once status is **Full**, **Closed**, or **cancelled**, **no further channel events** for that callup (except **payment → caller only**, allowed on `Closed` when payment toggles are allowed).
- On successful **follow** (**Seguir**), the client **requests notification permission** and registers Web Push (see §11). Follow succeeds even if permission is denied (Realtime-only until push is enabled later).
- **Realtime:** Supabase **`postgres_changes`** on relevant tables (`callups`, `players`, etc.) with RLS; no custom Realtime broadcast channels required in MVP.

**Restrictions**: user must be logged in in order to subscribe to caller channels, see US-010

# 3. BUSSINESS RULES:
 - player can register only once in a callup (by UserId or normalized guest name).
 - Players and callers can subscribe other players to a callup even if they are not registered users.
 - only caller can remove/edit players (names); payment: self if UserId present, else caller only.
 - all screens are first/mobile design. the actual flow works on whatsapp, so we should prioritize mobile screens.
 - Business is based in Colombia, all labels/user messages on spanish please. Code, docs, and comments in english.
 - Datetimes: America/Bogota only for pilot.
 - WaitListThreshold = **floor**(SpotsQuantity/2) at create; never recalculated.
 - Cancel = logical, irreversible, **read-only** afterwards; create a new callup if needed.
 - **Status:** `Open` | `Full` | `Closed` | `cancelled`. **Full** = no subscribe capacity (roster full and waitlist unavailable/full), date still future → can return to **Open**. **Closed** = past match datetime only → does not reopen. Labels ES: Abierta / Llena / Cerrada / Cancelada.
 - **Subscribe eligibility:** free roster spot OR (waitlist on and under threshold). Not gated only by Status label; when no capacity → status **Full**.
 - **Full** → on roster free spot (or spots increased restoring capacity), BE sets **Open**; UI refreshes via plaza libre (toast if open + push if background).
 - **Closed**: read-only **except HasPayment** (own payment if UserId; caller any row). No subscribe/unsubscribe/edit/promote/Crear Jugador.
 - **Full**: no new subscribe/Crear Jugador; unsubscribe/remove/edit/payment (and promote only if a roster spot is free) as otherwise allowed.
 - One callup per create submit (multi-date create out of scope).
 - Plazas default 10 (F5) / 12 (F6); caller may customize at **create** time.
 - Channel notify events: new callup, subscribe, unsubscribe, plaza libre while **Open**; payment changes → caller only.
 - Promote waitlist → roster: manual — **caller** (any waitlisted row) or **logged-in self** (`userId === me` on waitlist); concurrent self-promote → **FIFO by createdAt**; HasPayment reset to false; **notifies channel** (toast + push). Guests cannot self-promote.
 - Claim (attach `UserId` to existing guest row): **no** channel notification — roster occupancy unchanged.
 - Concurrent subscribe for last roster spot: **first request to commit wins**; loser `409`.
 - On create, caller joins roster only if checkbox **Subscribirme a la convocatoria** is checked.
 - PaymentKey (llave) **required** on create/edit: max 50, no spaces, letters/digits + email-allowed special characters only (alphanumeric, number-like, or email).
 - Claim on name match (no notify); otherwise subscribe creates a **new** player row (notify).
 - UserName slug unique, no spaces; **mandatory only for callers** (before creating callups), not for player-only flows.
 - Court **Name** and **Address** editable only by CreatedBy.
 - Selecting a court from search → **link** `caller_courts` on select. **No** `GET /courts/mine` — courts UX is **search / create / link on select** only.
 - Guest names: normalize for uniqueness among guests (`UserId` null) per callup — trim + case-insensitive, **no accent folding**; registered players unique by `UserId`. Claim uses the same name match rules.
 - Reports/stats on home: coming soon only (US-001); out of MVP implementation.
 - Channel follow UI: **Seguir** / **No Seguir**. **No self-follow**; caller still gets push/toast for activity on **their** callups as owner.
 - Realtime MVP: **`postgres_changes`** (+ RLS); same event semantics as push where applicable.
 - Concurrency §5: waitlist confirm prompts unchanged.

 ## 4. Data Model (Conceptual)
 Users
 - Id(uniqueidentifier guid)
 - UserName (string max 10, pattern [a-z0-9-]{5,10}): unique when set; **required only for callers** (null/absent OK for player-only users until they become callers). No spaces.
 - Email(string max 100)
 - Name(string max 100)
 - Phone(string length 10): digits only CO mobile, no +57. Persist raw digits. BE formatter returns display e.g. `+57 310 222 2222` (never expose in public callup UI per Security).

 Callup_Channel
- CallerUserId (uniqueidentifier guid)
- Link(string) => relativepath by default /{username} //caller could have more than one link in the future for now will be defaulted.

 Player_Subscriptions
 - PlayerUserId
 - CallerUserId
 - Callup_Channel

 Callups
 - Id(uniqueidentifier guid)
 - Caller(uniqueidentifier guid) => UserId who create the callup
 - CourtId(uniqueidentifier guid) => court where the callup will be played
 - type of Court(enum / int with limited options) => F5 - F6 (for now, could be more options in the future)
 - Date (DateTime): match instant; business TZ America/Bogota
 - SpotsQuantity(int)
 - WaitList(boolean)
 - WaitListThreshold(number): snapshot at create = **floor**(SpotsQuantity/2); **do not recalculate** on later spots edits
 - PaymentKey(string max 50): **required**; no whitespace; charset = letters, digits, and email-allowed special characters
 - Status (enum) => `Open` | `Full` | `Closed` | `cancelled`
 
 Caller_Courts:
 - CallerUserId(uniqueidentifier guid)
 - CourtId(uniqueidentifier guid)
 

 Courts
 - CreatedBy (uniqueIdentifier guid): only this user may edit **Name** and **Address**
 - Id(uniqueidentifier guid)
 - Name(string: max 100)
 - Address(string: max 100)

 Players
 - Id(uniqueidentifier guid)
 - Date(datetime): row createdAt (**FIFO** for concurrent self-promote)
 - CallupId(uniqueidentifier guid)
 - Name(string max 100): uniqueness among **guest** rows (`UserId` null) on same callup using trim + case-insensitive compare
 - HasPayment (boolean): false when promoted from waitlist
 - UserId (uniqueidentifier guid) => null for guests; set on **claim** or when a registered user subscribes
 - IsWaitList(boolean)
 
 ** notes: I have proposed a relational db based on realtime read/writes for more consistency please analize and comment on db structure based on official documentation not on what I have suggested.
 - roster and waitlist can be calculated from IsWaitList + SpotsQuantity

## 5. Concurrency management:
- If concurrent players subscribe and there are not spots available and waitlist is enabled and not full: prompt "Convocatoria llena, ¿quieres entrar a la lista de espera? Sí/No". Sí → waitlist row; No → no insert.
- If waitlist disabled or waitlist full: notify convocatoria llena only (no Sí/No waitlist).



 ## 6. Out of scope: 
 - Link with group of callups (specific link for one or more callups) could be in the future
 - payments (processing); “Valor por persona” in WhatsApp examples is illustrative only
 - Multiple dates at a time, only one callup per submission on create callup form.
 - Match reports / statistics / result records (home shows **Coming soon** only — US-001)
 - Court hard-delete when referenced by callups (soft unlink from caller_courts only in MVP)

## 7. Security:
- mail, phone of the players/caller should not be expose in any screen, only name.
- link/{username} visible for all (including unauthenticated).
- payment key (llave) visible for all with the link.
- **HasPayment** column (✅/❎) visible for all with the link, including anonymous — same as WhatsApp lists; it is only a boolean, not PII.
- **Roster / waitlist display order (MUST):** within each list (nómina and espera separately), players are ordered by **`createdAt` ascending** (enrollment order). Toggling **HasPayment**, editing a name, or other in-place field updates **MUST NOT** change row positions. New joins append; remove/promote may change membership but remaining rows keep relative enrollment order.

## 8. Audience:
- the scope of this app will be aprox 50 users, this is a pilot, we'll review this later on.




# 9. API CONTRACT (approved)

Base path: `/api/v1`  
Transport: Next.js Route Handlers (App Router).  
Auth session: **Supabase Auth + Google OAuth**; identity comes from the session cookie — **never trust `userId` from the client body** for “self” actions.  
JSON: `camelCase`. Dates: ISO-8601; business TZ `America/Bogota`.  
Validation: Zod at server boundary (constitution).

**Session persistence (MUST):** stay authenticated across app/browser restarts **until explicit logout** (`POST /api/v1/auth/logout`). Cookies use long `maxAge` (browser limits ~400 days). Next.js **Proxy** (`proxy.ts`) MUST call Supabase session refresh (`getUser` / equivalent) on matched requests so expired access JWTs are renewed and cookies rewritten — Server Components alone cannot persist refreshed tokens. Closing the PWA or tab MUST NOT require Google again while the refresh token remains valid.

### Conventions

**Auth levels**
- `anon` — no session
- `session` — logged-in user (Google)
- `caller` — session + `userName` set (can own callups)
- `owner` — caller who owns the resource

**Success envelope**
```json
{ "data": { } }
```
List:
```json
{ "data": { "items": [], "pageIndex": 0, "pageSize": 10, "totalCount": 0 } }
```

**Error envelope (RFC 7807 Problem Details)** — `Content-Type: application/problem+json`
```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "Mensaje en español para el usuario",
  "traceId": "uuid",
  "code": "CALLUP_FULL"
}
```
Common HTTP status: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` business conflict, `500` unexpected (detail genérico ES).

**Approved `code` values**
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CALLUP_FULL`
- `WAITLIST_CONFIRM_REQUIRED`
- `WAITLIST_FULL`
- `SPOT_TAKEN_FIFO`
- `CALLUP_READ_ONLY`
- `USERNAME_TAKEN`
- `USERNAME_IMMUTABLE`
- `NOT_COURT_OWNER`
- `SPOTS_BELOW_ROSTER`

**Public DTOs** never include `email`, `phone` (spec §7). Profile endpoints may return `phone` formatted for the **owner only**.

**Name matching (claim / guest uniqueness):** trim + collapse spaces + **case-insensitive only** — **no** accent folding (`José` ≠ `Jose`).

**PaymentKey (llave):** required, max 50, **no whitespace**; allowed characters = letters, digits, and special characters permitted in email addresses (e.g. `@ . _ + - ! # $ % & ' * / = ? ^ \` { | } ~`). Examples: `@nequi123`, `3102222222`, `vitola@gmail.com`.

**Callup `status` enum:** `Open` | `Full` | `Closed` | `cancelled` (labels ES: Abierta / Llena / Cerrada / Cancelada).

**Callup summary item (list endpoints)**
```json
{
  "id": "uuid",
  "matchAt": "2026-08-01T20:00:00-05:00",
  "status": "Open",
  "spotsQuantity": 12,
  "rosterCount": 7,
  "waitlistCount": 0,
  "courtName": "VECIGOL",
  "paymentKey": "@llave123",
  "subscribeEligibility": { "canJoinRoster": true, "canJoinWaitlist": false }
}
```

---

## 9.1 Auth & profile (Google)

### `GET /api/v1/auth/google`
- **Purpose:** Start Google OAuth (redirect to Supabase/Google).
- **Auth:** anon  
- **Query:** `redirectTo` (optional app path, e.g. `/caller` | `/player`), `intent` (`caller` | `player`)  
- **Success:** `302` to Google / Supabase authorize URL  
- **Stories:** US-002, US-008

### `GET /api/v1/auth/callback`
- **Purpose:** OAuth callback; exchange code; upsert local `Users` row from Google (`email`, `name`, `avatarUrl` when present).  
- **Auth:** anon (one-time code)  
- **Success:** `302` to app; if profile incomplete (missing name/phone) → redirect to complete-profile; if `intent=caller` and no `userName` → complete-caller-username; if `intent=caller` (or `redirectTo=/caller`) and profile ready → **`/caller`** (dashboard), **not** `/`.  
- **Client (US-001):** ready callers who open `/` while session is active must also be client-redirected to `/caller`.  
- **Stories:** US-001, US-002, US-008, US-010

### `POST /api/v1/auth/logout`
- **Purpose:** Clear session; client redirects to home.  
- **Auth:** session  
- **Success:** `204`  
- **Stories:** US-002

### `GET /api/v1/me`
- **Purpose:** Current user profile **only** (self). **No** `GET /users` or list-all-users endpoint. Players on a callup come from `players` scoped by `callupId`.  
- **Auth:** session  
- **Success `200`:**
```json
{
  "data": {
    "id": "uuid",
    "email": "a@gmail.com",
    "name": "Juan Bueno",
    "phone": "3102222222",
    "phoneDisplay": "+57 310 222 2222",
    "userName": "juanbueno",
    "avatarUrl": "https://...",
    "profileComplete": true,
    "isCaller": true
  }
}
```
- `userName` may be `null` (player-only). `isCaller` = `userName != null`.  
- **Stories:** US-010

### `PATCH /api/v1/me`
- **Purpose:** Update editable profile fields.  
- **Auth:** session  
- **Body:**
```json
{ "name": "Juan Bueno", "phone": "3102222222" }
```
- **Rules:** phone exactly 10 CO digits; name required. **Cannot** change `userName` here (immutable after set).  
- **Success `200`:** same shape as `GET /me`  
- **Errors:** `400` validation  
- **Stories:** US-010

### `POST /api/v1/me/username`
- **Purpose:** Set caller slug **once** (required before creating callups).  
- **Auth:** session  
- **Body:**
```json
{ "userName": "juanbueno" }
```
- **Rules:** `[a-z0-9-]{5,10}`, unique, no spaces; reject if already set (`409`). Creates default `Callup_Channel` link `/{userName}`.  
- **Success `201`:** `{ "data": { "userName": "juanbueno", "link": "/juanbueno" } }`  
- **Stories:** US-002, US-007, US-010

### `POST /api/v1/me/push-subscription`
- **Purpose:** Upsert Web Push subscription for this device (PWA).  
- **Auth:** session  
- **Body:** browser `PushSubscription` JSON (`endpoint`, `keys.p256dh`, `keys.auth`)  
- **Rules:** upsert by `endpoint` unique; bind to `auth.uid()`.  
- **Success `204`**  
- **Stories:** US-011

### `DELETE /api/v1/me/push-subscription`
- **Purpose:** Remove a device subscription (logout, permission revoked, or stale endpoint).  
- **Auth:** session  
- **Body:** `{ "endpoint": "https://..." }`  
- **Success `204`** (idempotent if already gone)  
- **Stories:** US-011

---

## 9.2 Callups

### `GET /api/v1/callups/mine`
- **Purpose:** Caller dashboard — callups owned by session user **only**. **No** global list of all callups.  
- **Auth:** caller  
- **Query:** `pageIndex=0`, `pageSize=10`, `status` optional (`Open`|`Full`|`Closed`|`cancelled`)  
- **Success `200`:** paginated callup **summary** items (id, matchAt, status, spotsQuantity, rosterCount, waitlistCount, courtName, subscribeEligibility). Newest first.  
- **Stories:** US-004

### `GET /api/v1/callers/{userName}/callups`
- **Purpose:** Public list of callups **for that caller channel only** (`/{userName}`). **No** endpoint lists callups across all callers.  
- **Auth:** anon (read)  
- **Query:** `pageIndex=0`, `pageSize=10`  
- **Success `200`:** paginated summaries + `subscribeEligibility` per item; includes `paymentKey`, court name/address; **no** email/phone.  
- **Errors:** `404` username not found — detail ES e.g. "No se encontró el usuario del caller."  
- **Stories:** US-008, US-009

### `GET /api/v1/callups/{id}`
- **Purpose:** Details + players for **one** callup (opened from a channel/dashboard list), not a callup directory.  
- **Auth:** anon (read)  
- **Success `200`:**
```json
{
  "data": {
    "id": "uuid",
    "status": "Open",
    "matchAt": "2026-08-01T20:00:00-05:00",
    "courtType": "F6",
    "spotsQuantity": 12,
    "waitList": true,
    "waitListThreshold": 6,
    "paymentKey": "@llave123",
    "court": { "id": "uuid", "name": "VECIGOL", "address": "..." },
    "rosterCount": 7,
    "waitlistCount": 0,
    "subscribeEligibility": { "canJoinRoster": true, "canJoinWaitlist": false },
    "players": [
      {
        "id": "uuid",
        "name": "Sebas bueno",
        "hasPayment": true,
        "isWaitList": false,
        "userId": "uuid-or-null",
        "createdAt": "..."
      }
    ]
  }
}
```
- **Stories:** US-004, US-005, US-009

### `POST /api/v1/callups`
- **Purpose:** Create callup.  
- **Auth:** caller  
- **Body:**
```json
{
  "courtId": "uuid",
  "courtType": "F5",
  "spotsQuantity": 10,
  "waitList": true,
  "matchAt": "2026-08-01T20:00:00-05:00",
  "paymentKey": "@nequi123",
  "subscribeMyself": false
}
```
- **Rules:** `paymentKey` required (charset §9 Conventions); `matchAt` not in past (Bogotá); `spotsQuantity` **min 1 max 30** (defaults 10/12 by type); `waitListThreshold = floor(spotsQuantity/2)` server-side; if `subscribeMyself` → insert roster row for caller. Links court via `caller_courts` if needed. After insert, set status `Open` or `Full` if `subscribeMyself` filled capacity.  
- **Success `201`:** `{ "data": { "id": "uuid" } }` (+ channel notify `new_callup`)  
- **Stories:** US-003a

### `PUT /api/v1/callups/{id}`
- **Purpose:** Edit callup (US-006).  
- **Auth:** owner  
- **Body:**
```json
{
  "courtId": "uuid",
  "courtType": "F6",
  "spotsQuantity": 12,
  "matchAt": "2026-08-01T20:00:00-05:00",
  "paymentKey": "@nequi123"
}
```
- **Rules:** no `waitList` (immutable); `spotsQuantity` 1–30 and ≥ roster count; type F5↔F6 rules; not `cancelled` / not `Closed`; **Open** or **Full** OK. If capacity restored from `Full` → set `Open`.  
- **Success `200`:** full callup detail  
- **Errors:** `409` `SPOTS_BELOW_ROSTER` | `CALLUP_READ_ONLY`  
- **Stories:** US-006

### `PATCH /api/v1/callups/{id}/revalidate-status`
- **Purpose:** Thread-safe status revalidation (UI hints `Full` / `Closed` → BE decides).  
- **Auth:** **session only** (any logged-in viewer); first writer wins lock  
- **BE rules:** if matchAt past → `Closed`; else if no subscribe capacity → `Full`; else → `Open`. Never overwrite `cancelled`.  
- **Success `200`:** `{ "data": { "id", "status", "changed": true } }`  
- **Stories:** US-004

### `POST /api/v1/callups/{id}/cancel`
- **Purpose:** Logical cancel (irreversible).  
- **Auth:** owner  
- **Success `200`:** `{ "data": { "id", "status": "cancelled" } }`  
- **Stories:** US-004

---

## 9.3 Courts

### `GET /api/v1/courts`
- **Purpose:** Global search by name/address. **No** list-mine endpoint — picker is search (≥3 chars) / create / link on select.  
- **Auth:** caller  
- **Query:** `search` (required, **min length 3**)  
- **Success `200`:** `{ "data": { "items": [ { "id", "name", "address", "createdBy" } ] } }`  
- **Stories:** US-003b

### `POST /api/v1/courts/{id}/link`
- **Purpose:** On **select** of a court from search (or picker), ensure `caller_courts` for the session caller.  
- **Auth:** caller  
- **Success `204`** (idempotent if already linked)  
- **Stories:** US-003b

### `POST /api/v1/courts`
- **Purpose:** Create court; normalize name UPPERCASE; unique name; set `createdBy`; link `caller_courts`.  
- **Auth:** caller  
- **Body:** `{ "name": "Vecigol", "address": "Calle 20 # ..." }`  
- **Success `201`:** court DTO  
- **Errors:** `409` duplicate name  
- **Stories:** US-003b

### `PUT /api/v1/courts/{id}`
- **Purpose:** Edit name/address — **only `createdBy`**.  
- **Auth:** session + must be `createdBy`  
- **Body:** `{ "name": "...", "address": "..." }`  
- **Success `200`:** court DTO  
- **Errors:** `403` / `NOT_COURT_OWNER`  
- **Stories:** US-003b

~~`DELETE /api/v1/courts/{id}/link`~~ — **not in MVP** (no unlink UI).

---

## 9.4 Players (roster / waitlist)

### `POST /api/v1/callups/{callupId}/players/subscribe`
- **Purpose:** Session user joins roster or waitlist (claim guest by normalized name if match).  
- **Auth:** session  
- **Body:**
```json
{ "acceptWaitlist": false }
```
- **Behavior:**  
  - If roster free → roster (`isWaitList=false`), `hasPayment=false`.  
  - If roster full and waitlist available → require `acceptWaitlist=true` or `409` with code `WAITLIST_CONFIRM_REQUIRED`.  
  - If no capacity → `409` `CALLUP_FULL` (status should be / become `Full`).  
  - **Last roster spot race:** first commit wins; loser `409` `SPOT_TAKEN_FIFO`.  
  - Claim: matching guest name + `userId` null → attach `userId` (trim + case-insensitive; **no** accent folding). **No** channel notify (roster seat unchanged).  
  - Blocked if `cancelled` or `Closed`.  
  - After success, if no capacity left → set status `Full`.  
- **Success `201`:** player row DTO  
- **Side effects:** channel event `subscribe` **only** when a **new** row is created (join roster/waitlist). **Not** on claim-only.  
- **Stories:** US-009, US-004

### `POST /api/v1/callups/{callupId}/players/guests`
- **Purpose:** **Inscribir** guest by name (public channel MVP) or caller admin.  
- **Auth:** **anon or session** (MVP: no login required). Server uses service role for write/status sync when anon so RLS does not block insert/update.  
- **Body:**
```json
{ "guestName": "Pepe", "acceptWaitlist": false, "hasPayment": false }
```
- **Rules:** same eligibility as subscribe; guest name uniqueness; `hasPayment` only honored if actor is **callup owner** (else forced false). Anon always `hasPayment=false`.  
- **Success `201`:** player DTO  
- **Stories:** US-005, US-008, US-009

### `POST /api/v1/callups/{callupId}/players/me/unsubscribe`
- **Purpose:** Session user leaves (roster or waitlist).  
- **Auth:** session  
- **Success `204`**  
- **Side effects:** if roster freed → maybe `Open` + `plaza_libre` (toast if app open + push if background)  
- **Stories:** US-009

### `DELETE /api/v1/callups/{callupId}/players/{playerId}`
- **Purpose:** Caller removes a player/guest row.  
- **Auth:** owner  
- **Success `204`**  
- **Side effects:** if roster freed → maybe `Open` + `plaza_libre`  
- **Stories:** US-005

### `PATCH /api/v1/callups/{callupId}/players/{playerId}`
- **Purpose:** Caller edits guest/player **name**.  
- **Auth:** owner  
- **Body:** `{ "name": "Pepe Nuevo" }`  
- **Success `200`:** player DTO  
- **Stories:** US-005

### `PATCH /api/v1/callups/{callupId}/players/{playerId}/payment`
- **Purpose:** Toggle HasPayment.  
- **Auth:** session  
- **Body:** `{ "hasPayment": true }`  
- **Rules:**  
  - If row has `userId`: only that user **or** owner.  
  - If guest (`userId` null): **owner only**.  
  - Allowed on `Closed`; blocked on `cancelled`.  
- **Success `200`:** player DTO  
- **Side effects:** notify **caller only**  
- **Stories:** US-005, US-009

### `POST /api/v1/callups/{callupId}/players/{playerId}/promote`
- **Purpose:** Waitlist → roster (manual).  
- **Auth:** session — **owner**, or **self** if `player.userId === me` and on waitlist  
- **Rules:** roster must have free spot; concurrent race → **FIFO by `createdAt`** wins (`409` `SPOT_TAKEN_FIFO` for loser); set `isWaitList=false`, `hasPayment=false`.  
- **UI (MUST):**  
  - Caller **Administrar** (US-005): promote on waitlist rows when a roster spot is free.  
  - Public player list (US-009): logged-in user with own waitlist row (`userId === me`) sees **Promover** (or equivalent) to self-promote when a roster spot is free.  
- **Success `200`:** player DTO  
- **Side effects:** channel notify to **all followers** (event `promote` or reuse `subscribe`) — **toast if app open + push if background** (caller-promote and self-promote both notify).  
- **Stories:** US-005, US-009

---

## 9.5 Caller channel (follow + push)

### `POST /api/v1/callers/{userName}/follow`
- **Purpose:** Follow caller channel (US-011). UI label **Seguir**.  
- **Auth:** session  
- **Rules:** **reject self-follow** when `{userName}` is the session user’s own slug (`403` `FORBIDDEN`). Idempotent if already following (`201` or `200` with `following: true`).  
- **Success `201`:** `{ "data": { "following": true } }`  
- **Client (after 201):** request notification permission + register push (§11). Follow is valid even if permission is denied.  
- **Stories:** US-011

### `DELETE /api/v1/callers/{userName}/follow`
- **Purpose:** Unfollow. UI label **No Seguir**.  
- **Auth:** session  
- **Success `204`**  
- **Stories:** US-011

### `GET /api/v1/callers/{userName}/follow`
- **Purpose:** Whether current user follows this caller.  
- **Auth:** session  
- **Success `200`:** `{ "data": { "following": true } }`  
- **Stories:** US-011

**Realtime (not REST):** Supabase **`postgres_changes`** on `callups` / `players` (and related) with RLS — **toast** when app open. No custom broadcast channels in MVP.  
**Web Push fan-out:** see **§11** — events `new_callup`, `subscribe`, `unsubscribe`, `plaza_libre`, **`promote`** → **channel followers + callup caller/owner**; `payment` → **caller only**. **Claim does not notify.** No self-follow. No channel churn events while `Full` / `Closed` / `cancelled` (payment exception for caller).

---

## 9.6 Endpoint ↔ story map

| Story | Endpoints |
|-------|-----------|
| US-001 | (no API; static landing) |
| US-002 | auth/google, callback, logout, me, me/username |
| US-003a | POST/PUT callups, courts search/create/link |
| US-003b | courts search/create/edit/link |
| US-004 | callups/mine, callups/{id}, cancel, revalidate, subscribe* |
| US-005 | players guests/patch/delete/payment |
| US-006 | PUT callups/{id} |
| US-007 | me/username + public callers/{userName}/callups |
| US-008 | auth + callers/{userName}/callups |
| US-009 | callups/{id}, subscribe, unsubscribe, promote, payment, guests |
| US-010 | me, PATCH me, me/username |
| US-011 | follow*, me/push-subscription (POST/DELETE) |

---

## 9.7 Approved decisions (closed)

1. Revalidate: **session only** (not anon).  
2. Courts `search` min length: **3**; **link on select** via `POST /courts/{id}/link`. **No** `GET /courts/mine`. Unlink **not in MVP**.  
3. Problem Details `code` enum: list in Conventions above.  
4. `spotsQuantity`: **min 1, max 30**.  
5. Name match / claim: trim + case-insensitive only; **no** accent folding.  
6. Status: **`Open` | `Full` | `Closed` | `cancelled`** — Full = no capacity (reopenable); Closed = past date only.  
7. PaymentKey: max 50, no spaces, email-allowed charset (not “@ only at start”).  
8. Last roster spot (subscribe): **first commit wins**. Promote race: **FIFO by createdAt**.  
9. Plaza libre delivery: **toast (Realtime) if app open + push if background**.  
10. Follow UI: **Seguir** / **No Seguir**. **No self-follow**; caller still notified as **owner** of their callups.  
11. **Promote** (waitlist→roster, caller or self): notifies channel (toast + push). **Claim**: no notify.  
12. Realtime MVP: **`postgres_changes`** only (no custom broadcast channels).
---
# 10. RLS (approved)

## 10.1 Principles

1. Browser / Route Handlers with user session → Supabase **anon key + user JWT**; RLS enabled on all tables.  
2. **`service_role` server-only** (revalidate lock, Web Push fan-out, rare admin). Never in the client.  
3. **No global user directory** and **no global callup directory** — scope is always **self**, **one caller channel**, or **one callup**.  
4. Players shown in UI come from **`players` filtered by `callup_id`**, not from listing `users`.  
5. Application layer still enforces eligibility / Cancelled / past-closed (RLS = who can touch rows).

## 10.2 `users`

| Op | Who | Policy |
|----|-----|--------|
| SELECT | session | **only own row** `id = auth.uid()` (powers `GET /me`) |
| SELECT | anon | **denied** on table — no list-users endpoint |
| UPDATE | session | **only own row**; `user_name` immutable once set (also API) |
| INSERT | auth signup / callback | `id = auth.uid()` |

**Resolve public caller by slug:** use `callup_channels` (or a narrow RPC/`SECURITY DEFINER` that returns `{ userName }` / channel id **without** email/phone). **Do not** `SELECT * FROM users` for anon.

**Players on a callup:** always `SELECT` from **`players` WHERE callup_id = …`** — never a users list.

## 10.3 `callup_channels`

| Op | Who | Policy |
|----|-----|--------|
| SELECT | anon + session | allowed (needed to resolve `/{userName}` → caller) |
| INSERT | session | `caller_user_id = auth.uid()` when username is set |
| UPDATE/DELETE | owner | `caller_user_id = auth.uid()` |

## 10.4 `player_subscriptions` (follow)

| Op | Who | Policy |
|----|-----|--------|
| SELECT | session | own follows (`player_user_id = auth.uid()`) and/or caller viewing followers of own channel |
| INSERT | session | `player_user_id = auth.uid()` |
| DELETE | session | `player_user_id = auth.uid()` |

## 10.4b `push_subscriptions` (device Web Push)

| Op | Who | Policy |
|----|-----|--------|
| SELECT / INSERT / UPDATE / DELETE | session | **only own rows** `user_id = auth.uid()` |
| Fan-out read | `service_role` | server loads endpoints for recipients after domain events (never from browser) |

## 10.5 `callups` — **no SELECT of all callups**

There is **no** policy/endpoint that returns every callup in the DB as a catalog.

| Op | Who | Policy |
|----|-----|--------|
| SELECT | session | **own** callups: `caller = auth.uid()` → `GET /callups/mine` |
| SELECT | anon + session | callups **of one caller channel only**, e.g. `caller IN (SELECT caller_user_id FROM callup_channels WHERE link/user_name = :userName)` → `GET /callers/{userName}/callups` |
| SELECT by id | anon + session | single row if it exists (opened from a channel list): `GET /callups/{id}` — still not a global list |
| INSERT | caller | `caller = auth.uid()` |
| UPDATE | owner | `caller = auth.uid()` (business rules in API) |
| DELETE | — | no hard delete; cancel = status update |

**Forbidden:** `GET /api/v1/callups` without owner/channel scope.

**Revalidate:** prefer RPC / `service_role` with lock — not a broad UPDATE grant to all sessions.

## 10.6 `players` — scope = callup

| Op | Who | Policy |
|----|-----|--------|
| SELECT | anon + session | rows for callups the requester can already see (same visibility as parent callup — via channel or own dashboard). Effectively: players of a **known callup_id**, not “all players in the system” |
| INSERT | session | self (`user_id = auth.uid()`) or guest create (authenticated); eligibility in API |
| UPDATE name | callup owner | via join `callups.caller = auth.uid()` |
| UPDATE has_payment | session | self if `user_id = auth.uid()`, or owner; guests → owner only |
| UPDATE promote (`is_wait_list`) | session | owner or self on waitlist |
| DELETE | owner **or** self | owner any row; self if `user_id = auth.uid()` (unsubscribe) |

## 10.7 `courts` / `caller_courts`

| Table | Op | Policy |
|-------|-----|--------|
| courts | SELECT | `authenticated` (search for callers); anon sees court only as nested data in callup responses (API join), not court directory |
| courts | INSERT | `created_by = auth.uid()` |
| courts | UPDATE | `created_by = auth.uid()` |
| caller_courts | SELECT/INSERT/DELETE | `caller_user_id = auth.uid()` |

Unlink endpoint not in MVP UI; **link on select** via `POST /courts/{id}/link`. DELETE on `caller_courts` may exist for future use.

## 10.8 API alignment

| Allowed list views | Scope |
|--------------------|--------|
| `GET /callups/mine` | callups where `caller = me` |
| `GET /callers/{userName}/callups` | callups of that channel only |
| `GET /callups/{id}` | one callup (+ `players` for that id) |
| `GET /me` | one user — self |

| Not allowed | |
|-------------|--|
| `GET /users` or list all users | |
| `GET /callups` listing all tenants | |
| Listing players without `callupId` | |

## 10.9 Client vs service_role

```text
Browser / Server Action (user JWT) → RLS as above
service_role (server only) → revalidate-status lock, Web Push fan-out
```

---

# 11. Push wiring (approved)

Separates **who wants channel events** from **how a device receives them**.

| Concept | Persistence | Role |
|---------|-------------|------|
| Follow canal | `player_subscriptions` | recipient set for channel events |
| Push subscription | `push_subscriptions` | device endpoint(s) for Web Push |

Follow without push = Realtime only while the app is open.  
Push without follow = device registered but **no** channel events **as follower** (caller still gets owner/payment notifies).  
**Caller:** must **not** self-follow; still receives callup activity notifications **as owner** (included in fan-out recipients).

## 11.1 Client flow (on follow)

```text
POST /callers/{userName}/follow  → 201
  → if Notification.permission !== "granted"
       → requestPermission()
  → if granted:
       → pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC })
       → POST /api/v1/me/push-subscription
  → if denied/dismissed:
       → follow remains; show ES copy that channel is followed but background push is off
```

If the user already follows and later opens the channel without a stored subscription, the client may prompt again (same path). Do **not** ask on cold landing before follow.

**Service Worker:** handle `push` → `showNotification(title, { body, data.url })`; `notificationclick` → navigate to `data.url`.

**iOS:** Web Push only when the PWA is added to Home Screen (Safari). See **§11.8** for install UX (button + Share → Agregar a pantalla de inicio).

## 11.8 Install PWA / Add to Home Screen (MUST)

Browsers **cannot** programmatically create a bookmark. Kortumo exposes **install / add to home screen** so users (especially iOS) can run as PWA and receive Web Push.

### Behavior

1. **Hide when already installed:** if `display-mode: standalone` (or equivalent iOS standalone), do **not** show the install control.
2. **Android / Chromium (installable):** listen for `beforeinstallprompt`, prevent the default mini-infobar when capturing for a custom CTA, and on button tap call `prompt()` on the deferred event. Label (ES): **Instalar app** (or **Agregar a inicio**).
3. **iOS Safari (and browsers without `beforeinstallprompt`):** show the same CTA; on tap open a short **instruction sheet** (overlay), not a fake install. Copy (ES), concise:
   - **Agregar Kortumo a inicio**
   - 1. Toca **Compartir** (□↑) en Safari  
   - 2. Elige **Agregar a pantalla de inicio**  
   - 3. Confirma **Agregar**  
   Mention that on iPhone, **avisos en segundo plano** requieren este paso.
4. **Not a browser bookmark API** — do not claim “guardar favorito”; product language is install / pantalla de inicio.

### Placement (MVP)

- **Landing `/`:** secondary control **below** the primary role CTAs (not in the brand-first hero chrome as a competing primary). Prefer a compact text/button under the CTA group or in the below-fold section — must not overpower brand or role CTAs.
- **Public channel `/{username}`:** compact control near **Seguir** / channel header so followers can install before relying on push.
- Optional dismiss for the session (`sessionStorage`) so the prompt is not sticky-noise; do not block follow or enroll.

### Prerequisites (already in product)

- `app/manifest.ts` (`display: standalone`, icons 192/512, **`start_url: "/"`** — see US-001; never `/caller`)
- Registered `/sw.js` (root layout)
- HTTPS (production) / localhost for install criteria
- Unauthenticated visit to `/caller` → redirect to **`/`** (home), **not** forced Google OAuth

**Changed (2026-07-30):** §11.8 install CTA + iOS Share instructions; Android `beforeinstallprompt`.  
**Changed (2026-07-30):** forbid PWA `start_url: "/caller"` (forced login regression).

## 11.2 Table `push_subscriptions`

| Column | Notes |
|--------|--------|
| `id` | uuid PK |
| `user_id` | → `users.id` (`auth.uid()`) |
| `endpoint` | text **UNIQUE** |
| `p256dh` / `auth` | PushSubscription keys |
| `user_agent` | optional |
| `created_at` / `updated_at` | |

One user → many devices (many endpoints). Upsert on `POST` by `endpoint`.

## 11.3 Server fan-out

After successful domain mutation (same request or post-commit; sync OK for ~50-user pilot):

1. Resolve **recipients** (below).  
2. Load all `push_subscriptions` for those `user_id`s via **`service_role`**.  
3. Send with `web-push` + VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).  
4. On push-service `404` / `410` → delete that endpoint row.

Realtime still updates open UIs; dedupe of toast + notification is **not** required in MVP.

## 11.4 Events, recipients, noise window

| Event | Recipients | Emit when |
|-------|------------|-----------|
| `new_callup` | **followers** of that channel (not the creating caller — they already know) | callup created |
| `subscribe` | **followers + callup caller/owner** | **new** player row joins roster or waitlist (**not** claim) |
| `unsubscribe` | **followers + caller/owner** | player leaves / removed (and may free a spot) |
| `promote` | **followers + caller/owner** | waitlist → roster (caller **or** self-promote) |
| `plaza_libre` | **followers + caller/owner** | roster spot frees + status becomes Open (or equivalent free-spot signal) |
| `payment` | **caller only** | `hasPayment` toggle |

**Claim:** attach `userId` to existing guest row → **no** channel event (roster occupancy unchanged).

**Self-follow:** not allowed. Owner notifications do **not** require a `player_subscriptions` row.

**Delivery:** Realtime **toast** via **`postgres_changes`** if app open; **Web Push** if background (both for every notifying event above, including `promote` and `plaza_libre`).

**Noise window:** emit channel events (`new_callup`, `subscribe`, `unsubscribe`, `promote`, `plaza_libre`) only while the callup is **Open** (or for the mutation that transitions into `Full` — the successful join that filled capacity still notifies). **Do not emit** further channel churn events once status is:

- **`Full`**, or  
- **`cancelled`**, or  
- **`Closed`** (past date).

Payment → caller only; may still apply on `Closed` when payment edits are allowed.

## 11.5 Notification payload

```json
{
  "title": "Nueva convocatoria",
  "body": "Vitola abrió un partido el 1 ago 8:00 pm",
  "url": "/vitola",
  "event": "new_callup",
  "callupId": "uuid-or-null",
  "callerUserName": "vitola"
}
```

Copy in **Spanish**. Typical `url`: `/{userName}` or `/callups/{id}` for roster-related events.

## 11.6 Approved decisions (closed)

1. Request notification permission **on follow** (**Seguir** / **No Seguir**).  
2. `plaza_libre` → followers + caller/owner; toast if open + push if background.  
3. `subscribe` / `unsubscribe` / `promote` → push/toast to followers + caller/owner while **Open**; noise ends when **Full** / **Closed** / **cancelled**.  
4. **Claim** does not notify (roster seat unchanged). **Promote** (caller or self) always notifies (toast + push).  
5. **No self-follow**; caller notified as **owner**.  
6. Realtime = **`postgres_changes`** only.  
7. Courts = search / create / link on select only (no mine list).  
8. **PWA = Next.js official + manual `public/sw.js`** (no Serwist / next-pwa).  
9. Server push send: **`web-push`** library **approved**.  
10. **Install UX (§11.8):** custom **Instalar app** via `beforeinstallprompt` on Chromium; iOS → Share → Agregar a pantalla de inicio instructions. Not a bookmark API.

## 11.7 Live UI via Realtime (MUST — not optional polish)

**Problem that must not recur:** shipping REST enroll (`POST …/guests`) while open screens only `fetch` once means two phones never see each other’s players until refresh. Spec/plan historically said “Realtime later / toast polish” → regenerated tasks skipped the client subscription.

**Contract (source of truth):**

1. **Open callup UIs MUST** subscribe to Supabase Realtime `postgres_changes` on `public.players` **and** `public.callups`, then **refetch** so that **without manual reload** the UI updates:
   - player roster / waitlist rows
   - summary counts (e.g. **7 / 12 → 8 / 12**, waitlist count)
   - **status** label (e.g. **Abierta ↔ Llena**, and Closed when applicable)
2. Applies to: public `/{username}` list + expanded roster, caller dashboard list, and admin `/callups/{id}` (header counts + status + roster).
3. Works for **anon and authenticated** viewers (RLS already allows `SELECT` on players for visible callups).
4. Tables **MUST** be in publication `supabase_realtime` (`players`, `callups`) — see migration `0004_realtime_publication.sql` / Dashboard → Database → Publications.
5. Toasts (§11.4) are **additional** UX on top of live list refresh; live list refresh is required even before toast polish.
6. When regenerating `tasks.md` from this spec / `plan.md`, include an explicit task: *“Wire browser `postgres_changes` + publication; AC: two devices see Inscribir without refresh.”* Do **not** park this under “later polish”.

**Anti-patterns (forbidden as “done”):** fetch-on-mount only; documenting Realtime in README while no `createBrowserClient` / `.channel().on('postgres_changes')` exists; treating multi-device stale UI as acceptable MVP.
