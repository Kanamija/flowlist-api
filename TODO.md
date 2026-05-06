# TODO

Single source of truth for what's left on FlowList. Covers both repos. Keep this file identical in `flowlist-api` and `flowlist-client` — when you check something off in one, mirror it in the other.

## Status

**Today:** Tuesday, May 5, 2026
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

**Uncommitted at end of day:** the login route + login tests in `src/routes/auth.ts` and `src/tests/auth.test.ts`. First thing tomorrow: commit + push (see Step 1 below).

**Tomorrow (Wednesday, May 6) — clear plan**

**Goal of the day:** finish the v2 backend auth loop. Add `POST /api/auth/logout` so all four routes (register, login, me, logout) are green in Vitest, then add an end-to-end test that walks register → `/me` → logout → `/me`-returns-401 to prove the whole loop fits together.

**Definition of done for tomorrow:** all four auth routes implemented and tested, end-to-end test passing, all changes committed and pushed on `flowlist-v2`. If travel eats into the day, ship in priority order — logout-route → logout-tests → end-to-end → Postman — and drop from the bottom.

---

**Step 1 — Commit Tuesday's login work (~5 min)**

If not done at end of day Tuesday:
- `feat(auth): POST /api/auth/login with bcrypt.compare + session cookie`
- `test(auth): login wrong password, no such user, happy path`

Push.

---

**Step 2 — Build `POST /api/auth/logout` (~20–30 min, learning-first)**

Before writing code, talk through:
- Where does the session id come from? *(`req.cookies.sid` — the cookie that was set during register/login.)*
- What does logout actually do on the server? *(Delete the session row so the cookie can no longer be redeemed.)*
- What if there's no cookie on the request? *(No-op success — logging out when not logged in isn't an error. Return 200.)*
- Why also `res.clearCookie`? *(So the browser stops sending a stale cookie on future requests.)*

Then write it (right after `router.post('/login', ...)` in `src/routes/auth.ts`, with `try/catch` like the others):
1. Read `req.cookies?.sid`. If missing, return 200 with `{ ok: true }`.
2. `DELETE FROM sessions WHERE id = $1` — fine if no row matches.
3. `res.clearCookie('sid', { path: '/' })`.
4. Return 200 with `{ ok: true }`.

---

**Step 3 — Logout tests (~10 min)**

Two tests in `src/tests/auth.test.ts`:
- Logout with no cookie → 200 (no-op).
- Register → logout → `GET /api/auth/me` returns 401 (proves the session was actually deleted server-side, not just the cookie cleared).

For the second test, use supertest's **agent** to carry cookies between calls:

```
const agent = request.agent(app);
await agent.post('/api/auth/register').send({ email: testEmail, password: 'password123' });
await agent.post('/api/auth/logout');
const me = await agent.get('/api/auth/me');
expect(me.status).toBe(401);
```

Plain `request(app)` does *not* carry cookies between calls; `request.agent(app)` does. That's the key difference.

---

**Step 4 — End-to-end test (~10 min)**

One test that walks the full loop in a single agent:
- Register → 201
- `GET /me` → 200, returns the user
- Logout → 200
- `GET /me` again → 401

When this passes, the v2 backend is done.

---

**Step 5 — Postman smoke test of /login + /logout (~5 min, optional)**

Skip if travel is eating the day. Vitest covers everything; this is muscle memory only.

---

**Step 6 — Final commits + push (~5 min)**

```
feat(auth): POST /api/auth/logout
test(auth): logout no-cookie + logout-clears-session
test(auth): end-to-end register → me → logout → me-401
```

Then **STOP**. Frontend auth UI is still ahead, but the v2 backend is done. Pick up the frontend after travel with fresh focus.

---

**If energy is left over (optional, in priority order):**

- Wire `full_name` into register: accept it from `req.body`, include it in the INSERT, return it in the user object. Small known loose end — column already exists nullable.
- Start the register form in `flowlist-client/src/App.tsx` — just inputs + a submit button calling `fetch('/api/auth/register', { method: 'POST', credentials: 'include', ... })`. No styling.
- Tighten the login happy-path test by asserting `password_hash` is *not* in the response body (closes a small coverage gap).

**If something blocks you:**

- Read the failure message carefully. Postgres errors usually name the exact column or constraint (the May 4 `full_name` debug is the template).
- Don't change unrelated code while debugging.
- Logout is the simplest of the three routes — if it breaks, it's almost certainly cookie reading or DELETE syntax, not anything subtle.

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
- [ ] Add `POST /api/auth/logout` and explain deleting server-side sessions plus clearing the browser cookie
- [ ] Verify each backend route in Postman before touching the frontend (register Postman'd; login + logout still owe a Postman pass)
- [ ] Add frontend auth UI only after the backend auth loop is understandable

### Backend setup

- [x] Wire up `src/middleware/sessions.ts` in `src/index.ts` — used by the auth router via `requireSession`, no longer dormant
- [x] Pick up the paused `day2-reference.md` walkthrough for `cookie-parser` + `POST /api/auth/register`

### Backend routes

- [x] `POST /api/auth/register` — hash password (bcrypt), insert user, create session row, set `sid` cookie *(refactored into `validateRegistration` + `createUser` + `createSession` helpers)*
- [x] `POST /api/auth/login` — verify password (`bcrypt.compare`), create session row, set `sid` cookie. No-leak `401 'invalid credentials'` for both wrong-password and no-such-user. `password_hash` stripped from response body.
- [ ] `POST /api/auth/logout` — delete session row, clear cookie
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
- [ ] Logout: no cookie → 200 (no-op)
- [ ] Logout: clears cookie and deletes session row server-side (verified via follow-up `/me` returning 401)
- [ ] End-to-end: register → `/me` returns user → logout → `/me` returns 401

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
