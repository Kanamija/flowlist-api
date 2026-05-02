# TODO

Single source of truth for what's left on FlowList. Covers both repos. Keep this file identical in `flowlist-api` and `flowlist-client` — when you check something off in one, mirror it in the other.

## Status

**Today:** Saturday, May 2, 2026
**MVP target:** ~Saturday, May 9, 2026
**Travel:** mid-week, 2–3 working days lost. Plan accordingly — front-load v1 this weekend, push v2 immediately after, save the demo polish for the end of the week.

**The staging rule still wins.** If a v2 task feels tempting before v1 is demo-done in the browser, stop. The whole point of staging is that "almost done" doesn't count.

---

## Already Done

### Backend (`flowlist-api`)

- [x] TypeScript + Express scaffold (`package.json`, `tsconfig.json`, `.env`)
- [x] Supabase project created
- [x] All 5 tables created (`users`, `sessions`, `class_templates`, `class_events`, `bookings`)
- [x] Schema migrated: `class_events.starts_at` replaces the original `date + start_time` pair
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

### Backend setup

- [ ] Wire up `src/middleware/sessions.ts` in `src/index.ts` (it's currently dormant)
- [ ] Pick up the paused `day2-reference.md` walkthrough for `cookie-parser` + `POST /api/auth/register`

### Backend routes

- [ ] `POST /api/auth/register` — hash password (bcrypt), insert user, create session row, set `sid` cookie
- [ ] `POST /api/auth/login` — verify password, create session row, set `sid` cookie
- [ ] `POST /api/auth/logout` — delete session row, clear cookie
- [ ] `GET /api/auth/me` — return current user from session, or 401 if no session
- [ ] Update CORS to allow credentials so the cookie travels cross-origin in dev

### Frontend

- [ ] Register form (email + password)
- [ ] Login form (email + password)
- [ ] Use `fetch(url, { credentials: "include" })` on all auth-relevant calls
- [ ] On app mount, call `GET /api/auth/me` to determine logged-in state
- [ ] "Logged in as X" header indicator (with email or name)
- [ ] Logout button that calls `POST /api/auth/logout` and clears local auth state

### Tests (Vitest + Supertest, in the API repo)

- [ ] Auth middleware blocks unauthenticated requests
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
