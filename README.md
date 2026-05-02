# FlowList API

Backend for **FlowList** — a scheduling app for a yoga studio. Students can browse the class schedule, log in, sign up for classes, and cancel their own bookings. Studio admins manage the schedule directly through the Supabase dashboard.

> The frontend lives in [`flowlist-client`](../flowlist-client) — Vite + React + TypeScript.

## What it is

Yoga studios often manage class sign-ups informally — paper sheets, group chats, "first come first served" with no real source of truth. The result: double bookings, missed cancellations, and admin headaches.

FlowList is the single source of truth for the class schedule and bookings. This repo is the API layer:

- A **public class schedule** anyone can browse without logging in
- **Session-based auth** (register, login, logout) for students
- **Bookings** with database-level guarantees against double-booking and over-capacity sign-ups

## How it works

```
Student opens the React client
        ↓
GET /api/classes  →  upcoming classes from Supabase
        ↓
Student registers / logs in  →  POST /api/auth/{register,login}
        ↓                       (session cookie set)
POST /api/bookings  →  signs up for a class
        ↓
Postgres enforces UNIQUE (user_id, event_id)
                  →  no double-booking, ever
```

## Architecture highlights

- **Session-based auth, not JWT.** Sessions live in Postgres — login = insert row, logout = delete row, every request checks the row. Forced logout (e.g. banning a user) just works.
- **Database-level booking integrity.** Double-booking and capacity rules are enforced by Postgres constraints, not application logic alone. The DB is the last line of defense.
- **UTC on the server, localized on the client.** `class_events.starts_at` is `timestamptz`; the client formats per the user's zone. The server never localizes.
- **No custom admin UI for the MVP.** The studio owner uses the Supabase dashboard directly. Keeping admin out of scope keeps the MVP small enough to actually ship.

## Tech stack

**Backend (this repo)**
- Node.js + Express + TypeScript
- Supabase (PostgreSQL)
- Vitest + Supertest for tests

**Frontend (separate repo)**
- React + Vite + TypeScript

## Status

In active development. Shipping in three discrete versions, each end-to-end before the next:

- **v1 — Public class schedule (no auth).** ← in progress
- **v2 — Authentication** (register, login, logout, session middleware)
- **v3 — Bookings** (sign up, cancel, capacity + double-booking rules)

"Done" for each version means the feature works end-to-end through the React UI, not just in Postman.

## Project structure

```
src/
  config/db.ts             # Supabase / Postgres connection
  middleware/sessions.ts   # session lookup middleware (drafted, paused until v2)
  index.ts                 # Express app + route registration
AGENTS.md                  # guidance for AI assistants working in this repo
CONTRIBUTING.md            # commit format, PR template, code-comment conventions
PROJECT_BRIEF.md           # product brief, MVP success criteria, stretch features
day2-reference.md          # paused v2 walkthrough (picked up after v1 ships)
FlowList-MVP-Planning.docx # MVP scope, staging, and definition of done
```

## Author

Built by Kanami Anderson.
