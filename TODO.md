# TODO

Single source of truth for what's left on FlowList. Covers both repos. Keep this file identical in `flowlist-api` and `flowlist-client` — when you check something off in one, mirror it in the other.

## Status

**Today:** Wednesday, May 6, 2026
**MVP target:** ~Saturday, May 9, 2026
**Travel:** mid-week, 2–3 working days lost. Plan accordingly — front-load v1 this weekend, push v2 immediately after, save the demo polish for the end of the week.

**The staging rule still wins.** If a v2 task feels tempting before v1 is demo-done in the browser, stop. The whole point of staging is that "almost done" doesn't count.

### End-of-day — Tuesday, May 5

**Done today:**
- Walked through `POST /api/auth/register` line-by-line — every piece now makes sense (parameterized queries, `RETURNING`, `result.rows[0]`, `httpOnly`, why we hash, why 201, what `next(error)` does, etc.). Confident enough to teach it back.
- **Refactored `/register`** into three small same-file helpers — `validateRegistration`, `createUser`, `createSession`. The route handler is now ~10 lines of orchestration that reads top-to-bottom.
  - Replaced the awkward `NOW() + ($2 || ' days')::interval` SQL with a JS-computed `expiresAt` `Date` passed as a normal parameter — much cleaner.
  - Fixed two bugs the refactor surfaced: a typo (`!\n==` instead of `!==`) in the password type check, and a missing `return` in `createSession`. Both caught by the existing test suite.
  - Committed as `refactor(auth): extract register helpers and fix validation typo` and pushed.
- Postman smoke test of `/register` — confirmed 201, `user` body, `Set-Cookie` header. Skipped saving to a Postman collection — Vitest already covers it; not worth fighting Postman's UI for.
- **Built `POST /api/auth/login`** end-to-end:
  - Reused `validateRegistration` for input validation (payoff from yesterday's refactor — same shape as register).
  - New helper `findUserByEmail` for the lookup; returns the row including `password_hash`.
  - `bcrypt.compare` to check submitted password against the stored hash.
  - **No-leak error:** identical `401 'invalid credentials'` for both "no such user" and "wrong password" — prevents user enumeration.
  - `password_hash` stripped from the response body via `const { password_hash, ...userSafe } = user`.
  - Reused `createSession` and the `sid` cookie pattern from register.
- Added 3 login tests (wrong password → 401, non-existent email → 401, happy path → 200 + `Set-Cookie`). All 7 tests in `auth.test.ts` green.
- Walked through every line of those 3 tests — `it`, `request(app)`, `.send`, `toBe` vs `toEqual` vs `toMatchObject`, why `afterEach` matters, the arrange/act/assert pattern.

**Uncommitted at end of day:** the login route + login tests in `src/routes/auth.ts` and `src/tests/auth.test.ts`. First thing tomorrow: commit + push (see Wednesday's plan below).

### End-of-day — Wednesday, May 6

**Done today:**

- **Backend logout shipped end-to-end, learning-first.** Walked through the four logout questions before writing code (where `sid` comes from, what logout actually does on the server, no-cookie handling, why also `res.clearCookie`). Wrote `POST /api/auth/logout` right after `/login` in `src/routes/auth.ts`: reads `req.cookies?.sid`, returns 200 with `{ ok: true }` if missing, otherwise `DELETE FROM sessions WHERE id = $1` and `res.clearCookie('sid', { path: '/' })`. Idempotent — logging out when not logged in is success, not an error.
- **Three logout tests added**, all green. (1) Logout with no cookie → 200 no-op (simplest case, written in the same plain-`request(app)` style as existing tests). (2) Register → logout → `/me` returns 401, using `request.agent(app)` to carry cookies between calls. (3) End-to-end: register → `/me` 200 → logout → `/me` 401, proving the whole loop fits together. Walked through what the agent is and why it's needed (plain `request(app)` is a fresh fake browser per call with no cookie memory; `request.agent(app)` is one fake browser that persists cookies across calls — required for any test that walks more than one auth-relevant request).
- **Postman smoke test deliberately skipped** — Vitest already covers register, login, and logout end-to-end; the muscle-memory tax wasn't worth the time tax this week.
- **v2 backend now done by the TODO's own definition of done.** All four auth routes implemented and tested, end-to-end test passing, all changes committed and pushed on `flowlist-v2` in three commits: `feat(auth): POST /api/auth/logout`, `test(auth): logout no-cookie + logout-clears-session`, `test(auth): end-to-end register → me → logout → me-401`.
- **Started v2 frontend (path A — email greeting) in `flowlist-client/src/App.tsx`.** Locked in the mental model first: `User | null` for auth state, fetch `/me` on mount to see if the cookie is valid, `credentials: 'include'` is the option that actually makes fetch send cookies. Nailed the **useEffect-vs-handler distinction**: time-driven fetches (mount, state change) go in useEffect; user-triggered fetches (form submit, button click) go directly in the event handler. Confirmed with a four-question quick test.
- **Frontend code added incrementally with line-by-line walkthroughs** for the early pieces:
  - `User` type below `ClassEvent`.
  - `const [user, setUser] = useState<User | null>(null);` — talked through `<User | null>` (the generic), why null is the "logged out" sentinel, and the destructuring pattern.
  - Second `useEffect` calling `GET /api/auth/me` with `credentials: 'include'`. Spent real time on what useEffect *is* (the side-effect escape hatch from React's render loop), why the dep array `[]` means "only on mount," why we wrap async work in an inner `loadUser()` function (useEffect's callback can't be async because its return slot is reserved for cleanup), what `credentials: 'include'` does, why the empty `catch {}` is doing real work (swallows network errors, documents intent), and when components unmount.
  - Conditional render in the page header: `{user ? <p>Logged in as {user.email}</p> : <p>Not logged in</p>}`. Saved, refreshed, saw "Not logged in" appear — first proof the conditional logic is wired up.
  - Three new state slots — `email`, `password`, `registerError`.
  - Replaced the false branch with a register form: controlled `<input>` for email, controlled `<input>` for password, submit button, `{registerError && <p>{registerError}</p>}` slot. The whole form block was copy-pasted at the very end and is **not yet understood line-by-line** — flagged as the very first thing for next session.

**Stopped here:** the form renders and inputs are typeable, but **its `onSubmit` is just `(e) => e.preventDefault()`** — clicking Register does nothing yet. No fetch, no logout button. App.tsx grew bigger than felt comfortable; flagged a future polish pass to extract a `RegisterForm` component or a `useAuth` custom hook, but deferred until the loop works (refactoring code you don't yet understand is a recipe for confusion).

**Decision banked for tomorrow:** path A tonight (email greeting only), path B tomorrow (collect `full_name` and greet by name).

---

**Tomorrow — clear plan**

**Goal of the next session:** finish the v2 frontend loop. Form currently does nothing on submit; teach it to actually register a user, then add the logout button, then test the full loop in the browser. **Walk through the existing form code line-by-line first** — most of it was pasted at the end of today and is not yet understood. Understanding before wiring.

**Definition of done for tomorrow:** register a brand new email through the React UI, see "Not logged in" flip to "Logged in as kanami@example.com", refresh the page and stay logged in, click logout, watch the indicator flip back to the form. That demo passing = v2 frontend done (minus the login form, which is a stretch).

---

**Step 1 — Walk through the existing register form code line-by-line (~20-30 min, learning-first)**

Before changing anything, slow read the entire `<form>...</form>` block in `App.tsx`. Unpack each concept:
- The **controlled input pattern** — what `value={email}` does, what `onChange={(e) => setEmail(e.target.value)}` does, why React state owns the input value (round-trip: type → onChange → setEmail → re-render → value).
- **`e.preventDefault()`** — what default form submission does in HTML (page reload, query string), why we always call this in React form handlers.
- **Arrow function syntax** — `(e) => setEmail(e.target.value)` and what `e.target.value` actually points at.
- **Two flavors of conditional render**: the ternary `{user ? <X/> : <Y/>}` (this OR that) and the `&&` form `{registerError && <p>...</p>}` (this OR nothing). When to use each.
- **HTML attributes**: `type="email"`, `type="password"`, `placeholder`, `required`. Any of these are unfamiliar, ask.

Do not write any new code in this step. The goal is to be able to point at every character in the form block and say what it's for.

---

**Step 2 — Wire the submit handler to actually register (~15-20 min)**

Replace the inline `(e) => e.preventDefault()` with a real handler. Either an inline arrow function in the `onSubmit` attribute or a named `async function handleRegisterSubmit(...)` defined inside `App()` — pick whichever feels cleaner once you've seen both shapes.

The handler should:
1. Call `e.preventDefault()` (still the first line).
2. Clear any stale error: `setRegisterError("")`.
3. `await fetch('/api/auth/register', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })`.
4. On 201 (`res.ok`): `const data = await res.json(); setUser(data.user);`. The "Logged in as X" branch of the ternary takes over and the form unmounts. **This is the win moment** — refresh the page and the indicator should still be there.
5. On non-201: `const data = await res.json(); setRegisterError(data.error);`. The `{registerError && <p>...</p>}` slot lights up.

Two new pieces to understand here that didn't come up tonight:
- **`Content-Type: application/json` header** — tells the server "the body I'm sending is JSON, parse it accordingly." Without this, `req.body` on the server side is empty.
- **`JSON.stringify(...)`** — turns the JS `{ email, password }` object into the JSON string the server expects. The server's `express.json()` middleware reverses it back into an object on arrival.

---

**Step 3 — Add the logout button (~5-10 min)**

Right next to the "Logged in as X" line in the truthy branch of the ternary, add a button. `onClick` calls `fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })`, awaits it, then calls `setUser(null)`. Indicator flips back to the form. No error handling needed — logout always succeeds (already proved that backend-side).

---

**Step 4 — Browser test the full loop (~10 min)**

`npm run dev` in both repos. Open the React app. Register a brand new email + password. Indicator flips to "Logged in as ...". Refresh — still logged in (this is the moment that proves `/me`-on-mount is doing its job). Click logout — back to form. Try registering the same email again — should see the error appear under the form (proves the error-state wiring works).

When this passes, mark the v2 demo checkboxes in the TODO and you're done with v2 minus the login form.

---

**Step 5 — Path B: wire `full_name` end-to-end (~20-30 min, only if step 4 lands cleanly)**

This is the polish pass that makes the page *actually* feel different on login. The TODO's v2 polish entry has the steps; column already exists on `users` (nullable), so no schema change.

Backend (`flowlist-api/src/routes/auth.ts`):
- Update `validateRegistration` to accept an optional `full_name` from `req.body` (don't make it required — keeps existing tests green).
- Include `full_name` in the INSERT in `createUser`. Add it to the `RETURNING` list so the user object includes it.
- Update the `findUserByEmail` SELECT to include `full_name` so login also returns it.
- (Optional) Add a small register test that supplies `full_name` and asserts it comes back in the response.

Frontend (`flowlist-client/src/App.tsx`):
- Add `full_name` to the `User` type.
- Add a `<input>` for full name to the register form (state, controlled input, included in the body).
- Update the indicator from `Logged in as {user.email}` to `Hi {user.full_name || user.email}!` so old users without a name still see something sensible.

---

**Step 6 — Commit + push (~5 min)**

Suggested commits:
- `feat(client): /me-on-mount + auth-aware page header`
- `feat(client): register form wired end-to-end with error handling`
- `feat(client): logout button`
- `feat(auth): collect full_name in /register and greet by name` *(if step 5 done)*

---

**Stretch (only if everything above lands and there's energy left):** start the login form in `App.tsx`. Near-identical to register — same JSX shape, same controlled-input pattern, just calls `/api/auth/login` instead. About 15 minutes once register is understood.

**If something blocks you:**
- Form submit "doing nothing" silently is almost always missing `Content-Type: application/json` or missing `JSON.stringify` — server sees an empty body and 400s, but if your error handling is broken too, it looks like nothing happened. Open the browser Network tab; the request and its response status will tell you immediately.
- "Logged in as ..." not appearing after a successful register means `setUser(data.user)` isn't firing. Check `res.ok` and the response body shape (`data.user`, not `data`).
- Refreshing logs you out unexpectedly = the cookie isn't being sent on `/me`. Confirm `credentials: 'include'` on the `/me` fetch.

---

## Already Done

### Backend (`flowlist-api`)

- [x] TypeScript + Express scaffold (`package.json`, `tsconfig.json`, `.env`)
- [x] Supabase project created
- [x] All 5 tables created (`users`, `sessions`, `class_templates`, `class_events`, `bookings`)
- [x] Schema migrated: `class_events.starts_at` replaces the original `date + start_time` pair
- [x] `users.full_name` column exists and is **nullable** — name is not collected at signup yet; wiring it into the register flow + UI is tracked under v2 polish
- [x] DB connection wired up (`src/config/db.ts`)
- [x] `GET /api/health` endpoint returns DB-reachable
- [x] Session middleware code drafted (`src/middleware/sessions.ts`) — paused until v2

### Frontend (`flowlist-client`)

- [x] Vite + React + TypeScript scaffold
- [x] ESLint config

### Documentation (both repos)

- [x] `AGENTS.md` — agent role, project philosophy, staging rules
- [x] `CONTRIBUTING.md` — Conventional Commits, PR template, comment guidelines
- [x] `README.md` — stranger-facing project overview
- [x] `PROJECT_BRIEF.md` — pitch, problem, success criteria, stretch, out of scope
- [x] `TODO.md` — this file

---

## v1 — Public Class Schedule

**Definition of done:** open the React app in a browser, see real upcoming classes from Supabase with start times in the local time zone. No login, no booking.

### Backend (`flowlist-api`)

- [x] Insert 3+ rows in `class_templates` via the Supabase dashboard (e.g. Vinyasa Flow, Yin, Power)
- [x] Insert 5+ upcoming rows in `class_events` via the Supabase dashboard, spread across the next two weeks
- [x] Add `GET /api/classes` to `src/index.ts` in the same style as `/api/health` — join `class_events` with `class_templates` so the response includes `name` and `description`
- [x] Verify the route in Postman — confirm `name`, `description`, `starts_at`, `duration_minutes`, `instructor`, `max_capacity` are all present
- [x] Bonus: also added `GET /api/classes/:id` for single-class lookup (optional v1 item)
- [ ] ~~Add basic CORS~~ — skipped, using Vite proxy instead

### Frontend (`flowlist-client`)

- [x] Add a `server.proxy` block to `vite.config.ts` so `/api/*` requests forward to `http://localhost:3000`
- [x] Replace the default Vite content in `src/App.tsx`
- [x] Define a `ClassEvent` TypeScript type that matches the API response shape
- [x] Fetch `GET /api/classes` from the schedule page on mount
- [x] Render each class with name, instructor, start time in the local zone, duration
- [x] Add a loading state while the fetch is in flight
- [x] Add an error state for network or 5xx responses
- [x] Add an empty state for "no upcoming classes"
- [x] Sort classes by `starts_at` ascending
- [x] Add a simple v1 presentation pass with FlowList branding and class-card styling

### Demo v1

- [x] Run `npm run dev` in both repos at the same time
- [x] Open the React app in a browser
- [x] Confirm real classes appear, with correct local-zone times
- [x] **STOP. v1 passed; v2 may begin next.**

---

## v2 — Authentication

**Definition of done:** register through the React UI, refresh the page and stay logged in, log out and watch the indicator update.

**Working agreement:** v2 is a learning-first pass. Go ultra slow, one small concept at a time. Before each code change, explain the problem, the file being touched, the exact code being added, why each non-obvious line exists, and how to test it before moving on. If only v2 gets done but it can be explained clearly, that is a win.

### v2 learning path

- [x] Wire `cookie-parser` into `src/index.ts` and explain middleware order
- [x] Create `src/routes/auth.ts` with a tiny route first, before adding password/session logic
- [x] Mount the auth router at `/api/auth` and explain route prefixes
- [x] Build `POST /api/auth/register` slowly: validate input, hash password, insert user, create session, set `sid` cookie
- [x] Add `GET /api/auth/me` with `requireSession` and explain cookies → sessions → `res.locals.user`
- [x] Add `POST /api/auth/login` and explain password comparison (`bcrypt.compare`, no-leak error message, `password_hash` strip via destructure)
- [x] Add `POST /api/auth/logout` and explain deleting server-side sessions plus clearing the browser cookie
- [ ] ~~Verify each backend route in Postman before touching the frontend~~ — skipped, Vitest already covers register/login/logout end-to-end; not worth the muscle-memory tax this week
- [ ] Add frontend auth UI only after the backend auth loop is understandable

### Backend setup

- [x] Wire up `src/middleware/sessions.ts` in `src/index.ts` — used by the auth router via `requireSession`, no longer dormant
- [x] Pick up the paused `day2-reference.md` walkthrough for `cookie-parser` + `POST /api/auth/register`

### Backend routes

- [x] `POST /api/auth/register` — hash password (bcrypt), insert user, create session row, set `sid` cookie *(refactored into `validateRegistration` + `createUser` + `createSession` helpers)*
- [x] `POST /api/auth/login` — verify password (`bcrypt.compare`), create session row, set `sid` cookie. No-leak `401 'invalid credentials'` for both wrong-password and no-such-user. `password_hash` stripped from response body.
- [x] `POST /api/auth/logout` — delete session row, clear cookie. Reads `req.cookies?.sid`, no-op 200 if missing, otherwise `DELETE FROM sessions WHERE id = $1` and `res.clearCookie('sid', { path: '/' })`.
- [x] `GET /api/auth/me` — return current user from session, or 401 if no session
- [x] ~~Update CORS to allow credentials~~ — skipped, using the Vite proxy so auth requests stay same-origin in dev

### Frontend

- [ ] Register form (email + password)
- [ ] Login form (email + password)
- [ ] Use `fetch(url, { credentials: "include" })` on all auth-relevant calls
- [ ] On app mount, call `GET /api/auth/me` to determine logged-in state
- [ ] "Logged in as X" header indicator (with email or name)
- [ ] Logout button that calls `POST /api/auth/logout` and clears local auth state

### v2 polish (after core auth works)

- [ ] Wire `full_name` into the register flow and the UI so the studio can greet students by name. The column already exists on `users` (nullable) — this is a code change only, not a schema change. Steps: accept `full_name` from `req.body` in `POST /api/auth/register`, include it in the INSERT, surface it in the "Logged in as X" indicator.

### Tests (Vitest + Supertest, in the API repo)

- [x] Auth middleware blocks unauthenticated requests (`/me` without cookie → 401)
- [x] Register: missing fields → 400
- [x] Register: invalid email → 400
- [x] Register: valid input → 201 + `Set-Cookie`
- [x] Login: wrong password → 401
- [x] Login: non-existent email → 401 (same response as wrong password — no enumeration leak)
- [x] Login: valid input → 200 + `Set-Cookie`
- [x] Logout: no cookie → 200 (no-op)
- [x] Logout: clears cookie and deletes session row server-side (verified via follow-up `/me` returning 401, using `request.agent(app)` to carry cookies across calls)
- [x] End-to-end: register → `/me` returns user → logout → `/me` returns 401

### Demo v2

- [ ] Register a new account through the UI
- [ ] Refresh the page — still logged in
- [ ] Log out — indicator updates
- [ ] **STOP. Do not start v3 until this checks pass.**

---

## v3 — Bookings

**Definition of done:** log in, click "Book", see the booking in "My bookings", cancel it. Double-booking and over-capacity attempts return friendly errors backed by database constraints, with tests proving it.

### Schema changes (BEFORE any booking code)

- [ ] Decide `spots_remaining` strategy: (a) drop the column and compute on read as `max_capacity − COUNT(bookings)`, or (b) keep it but only update via `UPDATE … WHERE spots_remaining > 0` and check rowcount
- [ ] Apply the chosen schema change in Supabase
- [ ] Add `UNIQUE (user_id, event_id)` constraint on `bookings`

### Tests (TDD — write the first one BEFORE the route)

- [ ] **Test first:** booking the same class twice returns 409, not 500
- [ ] Capacity enforcement — fill a class, attempt one more signup, expect rejection
- [ ] A student can only cancel their own booking, not someone else's

### Backend routes

- [ ] `POST /api/bookings` — sign up the logged-in user for a class
- [ ] `DELETE /api/bookings/:id` — cancel own booking, with permission check
- [ ] `GET /api/bookings/me` — list the current user's upcoming bookings (needed for the My bookings view)

### Frontend

- [ ] "Book" button on each class in the schedule (only visible when logged in)
- [ ] Disable or hide "Book" when the class is full
- [ ] "My bookings" section that lists the current user's upcoming bookings
- [ ] Cancel button on each booking
- [ ] After book/cancel, refresh the schedule and "My bookings" so the UI matches reality

### Demo v3 — MVP complete

- [ ] Log in through the UI
- [ ] Click "Book" on a class — booking appears in "My bookings"
- [ ] Try to book the same class twice — friendly error, not a 500
- [ ] Cancel a booking — disappears from "My bookings"
- [ ] **MVP complete. Record the demo.**

---

## Attainable Stretch (only if MVP is done early)

Small additions that fit in a few hours each. Anything bigger lives in `PROJECT_BRIEF.md` under Stretch Features.

- [ ] Group classes by day in the schedule ("Saturday May 9" with classes underneath)
- [ ] Format duration nicely ("60 min" instead of `60`)
- [ ] Show "X spots left" on each class card (uses whatever `spots_remaining` strategy you chose)
- [ ] Show "✓ Booked" inline on the schedule for classes the current user already booked
- [ ] CSS pass — typography, spacing, color palette that fits a yoga studio
- [ ] Simple footer with studio name and "Powered by FlowList"
- [ ] Friendly 404 / not-found state in the React app
- [ ] Filter classes by instructor (only if the seeded data has enough variety to make it interesting)
- [ ] "Today" / "This week" / "Later" sections in the schedule
- [ ] Disable past classes in the UI (don't render at all, or grey out)

---

## After MVP (do NOT touch this week)

These are listed in `PROJECT_BRIEF.md` Stretch Features. Resist the urge:

- Recurring class generation
- Custom admin dashboard (replacing direct Supabase usage)
- Email confirmation and reminders
- Password reset and email verification
- Waitlists
- Public deployment (hosted FE + BE)
- Payments
- Instructor portal
- Mobile-first redesign
- Multi-studio support
