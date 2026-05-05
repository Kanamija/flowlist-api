# TODO

Single source of truth for what's left on FlowList. Covers both repos. Keep this file identical in `flowlist-api` and `flowlist-client` — when you check something off in one, mirror it in the other.

## Status

**Today:** Monday, May 4, 2026
**MVP target:** ~Saturday, May 9, 2026
**Travel:** mid-week, 2–3 working days lost. Plan accordingly — front-load v1 this weekend, push v2 immediately after, save the demo polish for the end of the week.

**The staging rule still wins.** If a v2 task feels tempting before v1 is demo-done in the browser, stop. The whole point of staging is that "almost done" doesn't count.

### End-of-day — Monday, May 4

**Done today:**
- Wired `cookie-parser` into `src/index.ts`
- Built `POST /api/auth/register` end-to-end: input validation, `bcrypt` password hashing, user insert, session row insert, `sid` cookie set on response
- Mounted the auth router at `/api/auth` (correctly placed after the `/api/classes` routes)
- Added 3 register tests on top of the existing `/me` 401 test: missing fields → 400, invalid email → 400, valid input → 201 + `Set-Cookie`
- **Debugged a 500 on the register happy-path test:** Postgres rejected the insert because `users.full_name` had a `NOT NULL` constraint and the route doesn't supply it. Made `full_name` nullable in the Supabase dashboard. All 4 tests now pass.
- All auth changes are working but **uncommitted** — `src/index.ts`, `src/routes/auth.ts`, `src/tests/auth.test.ts`, `TODO.md` (plus the same `TODO.md` change in `flowlist-client`, and the earlier `AGENTS.md` / `README.md` v2 framing edits in the client)

**Tomorrow (Tuesday, May 5) — clear plan**

**Goal of the day:** first, actually understand the register route I wrote yesterday. Then finish the v2 backend auth loop (login + logout) so all four routes — register, login, me, logout — are green in Vitest and verified in Postman. Frontend is a stretch, only if there's time after backend is done.

**Definition of done for tomorrow:** end-to-end test passes (register → login → `/me` → logout → `/me` returns 401), all changes committed and pushed on `flowlist-v2`.

---

**Step 1 — Understand the `POST /api/auth/register` route line-by-line (~30 min, learning-first)**

**Why this is first:** login and logout are going to be variations on register. If I don't actually understand register yet, I'll be copy-pasting patterns I don't grasp, and any bug tomorrow will be confusing instead of fixable. Spending 30 minutes here saves an hour of being stuck later.

Open `src/routes/auth.ts` and the register handler. With the AI agent in teach mode, walk through it line by line. By the end, be able to say *out loud, in my own words*, what each of the following pieces does and why:

- `router.post('/register', async (req, res, next) => { ... })` — what does `router.post` actually register? Why is the full URL `/api/auth/register` even though the string here is just `/register`?
- The handler signature `async (req, res, next)` — what does each of the three parameters represent? Why is the function `async`?
- `try { ... } catch (error) { return next(error); }` — what does `next(error)` do, and why wrap the whole body in `try/catch`?
- `const { email, password } = req.body ?? {}` — what is `??` (the nullish coalescing operator), and why default to `{}` instead of just destructuring `req.body` directly?
- The two validation checks — why is the `typeof` check separate from the `@` check? Why return early with 400 instead of throwing?
- `await bcrypt.hash(password, 10)` — what is hashing? How is it different from encryption? What does the `10` mean (salt rounds / cost factor)? Why do we never store the plaintext password?
- `email.toLowerCase()` — why normalize before insert?
- The first `db.query` with `$1, $2` placeholders — why parameterized queries instead of string interpolation? (The answer involves SQL injection.) What does the `RETURNING` clause give back?
- `userResult.rows[0]` — what shape does the `pg` library return from a query?
- The second `db.query` inserting into `sessions` — what is `NOW() + ($2 || ' days')::interval` actually doing, and why is it written that way instead of computing a `Date` in JavaScript and passing it in?
- `res.cookie('sid', sessionId, { httpOnly: true })` — what is `httpOnly` and why does it matter for an auth cookie? What would change if we left it off?
- `return res.status(201).json({ user })` — why 201 instead of 200? Notice what's *not* in the response (no `password_hash`, no `sessionId`) — why are those omitted on purpose?

When all of those make sense, write a short note in `day2-reference.md` (3–5 bullets) summarizing what register does in plain English. That note becomes the mental template for login and logout.

---

**Step 2 — Clean up before writing anything new (~10 min)**

1. `cd flowlist-api`, run `npm test` — confirm all 4 tests still pass (sanity check after sleep).
2. Commit today's work in small, focused commits on `flowlist-v2`:
   - `feat(auth): POST /api/auth/register with bcrypt + session cookie`
   - `test(auth): register validation + happy path`
   - `chore(db): make users.full_name nullable` *(Supabase change has no file to commit, but mention in the commit body of the feat above OR add a note in `day2-reference.md`)*
   - `docs(todo): May 4 wrap-up + tomorrow plan`
3. In `flowlist-client`: commit the uncommitted `AGENTS.md`, `README.md`, and `TODO.md` updates.
   - `docs(agents,readme): reframe for v2 auth phase`
   - `docs(todo): sync from API repo`
4. Push both branches.

---

**Step 3 — Verify register in Postman (~10 min)**

1. Run the API: `npm run dev`
2. In Postman: `POST http://localhost:3000/api/auth/register` with body `{ "email": "kanami+postman@example.com", "password": "test1234" }`
3. Confirm: 201 status, `user` object in body, `Set-Cookie: sid=...` in response headers
4. Save the request to a Postman collection so login + logout are easy to test next.

---

**Step 4 — Build `POST /api/auth/login` (~30–45 min, learning-first)**

Before writing code, talk through (with the AI agent or to yourself):
- What does login need to do that register doesn't? *(Look up an existing user, compare passwords.)*
- Why use `bcrypt.compare` instead of comparing strings? *(Never store or compare plain-text passwords.)*
- What's the same as register? *(Creating a session row, setting the `sid` cookie.)*

Then write it:
1. In `src/routes/auth.ts`, add `router.post('/login', …)`.
2. Validate `email` and `password` are strings (same shape as register).
3. `SELECT id, email, role, password_hash FROM users WHERE email = $1` — handle the not-found case with 401 ("invalid credentials").
4. `bcrypt.compare(password, user.password_hash)` — handle false with 401 ("invalid credentials"). *Same generic error message for "user not found" and "wrong password" — don't leak which one it was.*
5. Insert a `sessions` row, set the `sid` cookie, return `{ user }` with 200.

Then add tests in `src/tests/auth.test.ts`:
- Login with wrong password → 401
- Login with non-existent email → 401
- Login with valid input → 200 + `Set-Cookie`

Verify in Postman.

---

**Step 5 — Build `POST /api/auth/logout` (~20–30 min)**

Before writing code, talk through:
- Where does the `sid` come from? *(The cookie on the request — `req.cookies.sid`.)*
- What does "logout" actually do? *(Delete the row in the `sessions` table so the cookie is no longer valid, then clear it from the browser.)*

Then write it:
1. `router.post('/logout', …)`.
2. Read `req.cookies.sid`. If missing, still return 200 — logging out when not logged in is a no-op, not an error.
3. `DELETE FROM sessions WHERE id = $1`.
4. `res.clearCookie('sid')`.
5. Return 200 with `{ ok: true }`.

Tests:
- Logout without a cookie → 200 (no-op)
- Logout after login → 200, and a follow-up `GET /me` with the cleared cookie returns 401

Verify in Postman.

---

**Step 6 — End-to-end test (~15 min)**

In `src/tests/auth.test.ts`, add one test that walks the full loop using a single supertest agent so cookies persist between calls:

```
const agent = request.agent(app);
await agent.post('/api/auth/register').send({...});  // 201
const meAfterRegister = await agent.get('/api/auth/me');  // 200, returns user
await agent.post('/api/auth/logout');  // 200
const meAfterLogout = await agent.get('/api/auth/me');  // 401
```

Or, more thorough: register → logout → login → `/me` → logout → `/me` 401.

---

**Step 7 — Stop and commit (~10 min)**

1. Run `npm test` — all green.
2. Postman a final manual smoke test of the full loop.
3. Commit:
   - `feat(auth): POST /api/auth/login`
   - `feat(auth): POST /api/auth/logout`
   - `test(auth): end-to-end auth flow`
4. Push.
5. **STOP.** Do not start the frontend tonight unless you genuinely have an hour of fresh focus left. Tomorrow-Wednesday belongs to the v2 frontend.

---

**If energy is left over (optional, in this order):**

- Wire `full_name` into register and the response (small detour, satisfying loose end)
- Start the register form in `flowlist-client/src/App.tsx` — just the form, no styling
- Cross out the matching items in this TODO

**If something blocks you:**

- Check `day2-reference.md` for the original walkthrough
- Read the test failure message carefully (today's `full_name` debug is the template — Postgres tells you exactly what's wrong if you read the error)
- Don't change unrelated code while debugging

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
- [ ] Add `POST /api/auth/login` and explain password comparison
- [ ] Add `POST /api/auth/logout` and explain deleting server-side sessions plus clearing the browser cookie
- [ ] Verify each backend route in Postman before touching the frontend (register tested in Vitest, still owes Postman pass)
- [ ] Add frontend auth UI only after the backend auth loop is understandable

### Backend setup

- [x] Wire up `src/middleware/sessions.ts` in `src/index.ts` — used by the auth router via `requireSession`, no longer dormant
- [x] Pick up the paused `day2-reference.md` walkthrough for `cookie-parser` + `POST /api/auth/register`

### Backend routes

- [x] `POST /api/auth/register` — hash password (bcrypt), insert user, create session row, set `sid` cookie
- [ ] `POST /api/auth/login` — verify password, create session row, set `sid` cookie
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
- [ ] Login: wrong password → 401
- [ ] Login: valid input → 200 + `Set-Cookie`
- [ ] Logout: clears cookie and deletes session row
- [ ] End-to-end: register → login → `/me` returns user → logout → `/me` returns 401

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
