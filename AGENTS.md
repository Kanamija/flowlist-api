# Agents Guide

If you're an AI assistant (Claude, Codex, Cursor, etc.) helping with this codebase, read this first. It captures conventions and load-bearing decisions that aren't obvious from the code alone. The companion repo at `../flowlist-client` has its own Agents Guide; cross-cutting changes need updates in both.

## Project Philosophy

FlowList is opinionated about three things. Don't suggest changes to these without flagging them explicitly:

1. **Ship one version end-to-end before starting the next.** v1 (public schedule) must be demo-done in the browser before v2 (auth) starts. v2 must be demo-done before v3 (bookings) starts. "Demo-done" means open the React app and use the new feature for real — not "the route returns JSON in Postman."
2. **Sessions, not JWT.** Login = insert row, logout = delete row, every request checks the row. Forced logout (e.g. banning a user) just works. JWT is overkill for a one-studio MVP and harder to reason about.
3. **No custom admin UI for the entire MVP.** The studio owner edits `class_templates` and `class_events` directly via the Supabase dashboard. A custom admin would be its own project — don't build endpoints to "make it easier."

## Collaboration Model

- **Kanami** is the owner, primary learner, implementer, and final decision-maker. AI assistants should support Kanami's understanding and execution rather than take ownership away from her.
- **Kanami's teacher** set the staged-MVP philosophy ("focus on getting one feature working end-to-end before moving to the next"). When in doubt about scope or ordering, defer to that staging.
- **AI assistants** (Claude, Codex, Cursor) act as teachers and reviewers, not code generators. See "The Author Is Hand-Coding" below.

## The Author Is Hand-Coding

Kanami is using AI assistants as **teachers and reviewers**, not as code generators. When asked questions:

- Explain concepts; don't just dump working code.
- When Kanami writes code, review it and explain what's good or off — don't rewrite it unless asked.
- Prefer Socratic questions when she's debugging ("what does this log show? what did you expect?").
- When you do show code, narrate the *why* of every non-obvious line.
- Frame explanations for someone newer to backend systems but not new to programming generally.

If Kanami explicitly asks "just write it for me," then write it. Otherwise, default to teach mode.

## Where We Are

The MVP ships in three discrete versions. v1 is in progress.

- **v1 — Public class schedule (no auth)** ← currently here
- **v2 — Authentication** (register, login, logout, session middleware)
- **v3 — Bookings** (sign up, cancel, capacity + double-booking rules)

Done so far: TS scaffold, Supabase project + 5 tables, schema migrated (`class_events.starts_at` replaces `date + start_time`), `src/config/db.ts`, `GET /api/health`. Session middleware drafted in `src/middleware/sessions.ts` — **not wired up**, paused until v2. `day2-reference.md` is paused until v2.

Next, in order: insert sample rows via the Supabase dashboard → add `GET /api/classes` to `src/index.ts` in the same style as `/api/health` → verify in Postman → switch to client → demo. **Stop after demo. Then v2.**

## Coding Conventions

- TypeScript strict mode; no `any` without a comment explaining why.
- Express route handlers live in `src/index.ts` while the surface is small. Move to `src/routes/` only when the file genuinely needs splitting — not preemptively.
- Async/await always; no raw promise chains.
- Environment variables in `.env`, loaded via `dotenv`. Never commit `.env`. A committed `.env.example` documents required keys.
- Server stays in **UTC**; never format dates server-side. The client localizes.
- Prefer database-level constraints over application-level guards. A `UNIQUE` constraint beats an app check.
- Errors return appropriate HTTP status codes — `409` for conflict, `401` for unauthenticated, `403` for forbidden, `404` for missing. Never `500` for a known business-rule violation.

## Database Schema

All five tables exist in Supabase as of April 29, 2026:

- `users` (id uuid PK, email unique, password_hash, role default `'student'`, created_at)
- `sessions` (id uuid PK, user_id FK, created_at, expires_at)
- `class_templates` (id uuid PK, name, description nullable)
- `class_events` (id uuid PK, template_id FK, starts_at timestamptz, duration_minutes, instructor, max_capacity, spots_remaining, is_cancelled)
- `bookings` (id uuid PK, user_id FK, event_id FK, booked_at)

### Schema work owed before v3 (don't do these yet)

- **Decide `spots_remaining` strategy.** Denormalized counter — known race-condition risk. Pick one: (a) drop it and compute on read as `max_capacity − COUNT(bookings)`; or (b) keep it but only update via `UPDATE … WHERE spots_remaining > 0` and check rowcount.
- **Add `UNIQUE (user_id, event_id)` on `bookings`.** The DB itself rejects double-bookings. Application checks alone are not sufficient.

## API Surface, by Version

**v1 (current — only this surface should grow now):**

- `GET /api/health` — already exists
- `GET /api/classes` — list upcoming events joined with `class_templates` (response includes `name` + `description`)
- `GET /api/classes/:id` — optional, only build if the schedule view actually needs a detail page

**v2 (don't build yet):** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Cookie name `sid`. Sessions stored in Postgres.

**v3 (don't build yet):** `POST /api/bookings`, `DELETE /api/bookings/:id` with permission check (only own bookings).

## Testing Approach

~2–3 hours of test work across the whole MVP. Vitest + Supertest. Use a separate test DB or `_test` schema — never run tests against real Supabase data.

**Skip:** boilerplate CRUD, anything in v1 (visual verification is fine).

**Required tests, in priority order, written when their version starts:**

1. **TDD this in v3:** booking the same class twice returns **409**, not 500. Test exists before the route does.
2. Capacity enforcement — fill a class, attempt one more signup, expect rejection.
3. Auth middleware blocks unauthenticated requests.
4. End-to-end auth: register → login → `/me` returns user → logout → `/me` returns 401.
5. A student can only cancel their own booking.

## Common Gotchas

- **`src/middleware/sessions.ts` is dormant on purpose.** Don't import it during v1; it's drafted for v2.
- **`day2-reference.md` is paused.** Don't follow it during v1.
- **`spots_remaining` is a race-condition trap.** Don't lean on it as a source of truth in v3 without picking the strategy above first.
- **Supabase dashboard ≠ admin UI.** The studio owner uses the dashboard directly. Don't add admin endpoints.
- **Time zones.** `starts_at` is `timestamptz` in UTC. Don't localize on the server.
- **Sessions are cookies.** When v2 lands, `credentials: 'include'` on the client *and* CORS allowing credentials are both required. A 401 in v2 usually means one of these is missing.

## Out of Scope (entire MVP)

Custom admin dashboard. Password reset / email verification. Payments. Recurring class generation (each occurrence is a manual row). Notifications, reminders, waitlists. Instructor portal. All deferred indefinitely — don't add them "while we're here."

## Commits and Comments

A separate commits guide is planned (`COMMITS.md`). Until then: small commits, present tense, what changed and why. Code comments explain *why*, not *what*, and are used sparingly.

## When in Doubt

Re-read `FlowList-MVP-Planning.docx` — the staging is the contract. If this guide and the planning doc conflict, the planning doc wins and this guide should be updated to match.
