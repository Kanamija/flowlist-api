# Project Brief

## One-Sentence Pitch

FlowList is a yoga studio scheduling app where students browse a public class schedule, log in to book, and the database itself guarantees no double-bookings or over-capacity sign-ups.

## Who It Is For

FlowList is for small yoga studios that currently manage class sign-ups informally and want a single source of truth without buying a heavyweight booking platform. Two user types:

- **Students** who want to find upcoming classes, book a spot, and cancel when plans change.
- **Studio admin** (one person, the owner) who needs to add classes, edit instructors, and adjust capacity.

The first target user is a small studio whose owner is currently managing bookings via paper sheets and group chats.

## Problem

Yoga studios often manage class sign-ups informally — paper sheets, group chats, individual messages, "first come first served" with no real source of truth. The result:

- **Double bookings** — two students each think they got the last spot.
- **Missed cancellations** — someone cancels and the spot doesn't reopen.
- **Admin overhead** — the owner spends time reconciling instead of teaching.

## Product Bet

A single source of truth + database-level integrity is enough. The app doesn't need a fancy admin UI, payment processing, or recurring-class generation to be useful. A public schedule, simple session-based login, and bookings that Postgres itself prevents from going wrong solves the actual studio's actual pain. The Supabase dashboard is the admin tool. The whole stack stays small enough for one person to ship and maintain.

## Core Mechanic

The whole experience runs on three primitives:

1. **Public schedule.** Anyone can browse upcoming classes without logging in, with start times in their local time zone.
2. **Session-based auth.** Students register and log in to access bookings. Sessions live in Postgres — login = insert row, logout = delete row, every request checks the row.
3. **Database-enforced bookings.** A `UNIQUE (user_id, event_id)` constraint prevents double-bookings. Capacity is enforced at the database level. The application can't accidentally allow what the database disallows.

The studio owner edits `class_templates` and `class_events` directly in the Supabase dashboard. There is no custom admin UI in the MVP.

## MVP Success Criteria

The MVP ships in three discrete versions, each demo-able end-to-end before the next is started.

- A student can open the site and see real upcoming classes from Supabase, with start times in their local time zone, without logging in.
- A student can register, log in, log out, and stay logged in across page refreshes.
- A student can book an upcoming class and see it appear in their "My bookings" view.
- A student can cancel their own booking, and cannot cancel someone else's.
- Double-booking the same class returns 409 (not 500), enforced by a database constraint and proven by a test.
- A class fills to capacity, and the next signup is rejected — proven by a test.
- The studio owner can add and edit classes via the Supabase dashboard without the developer's help.
- The whole MVP can be demoed locally — open the site, register, book a class, see it in My bookings, cancel it.

## Stretch Features

These are not required for the MVP demo, but are strong follow-up candidates if the core build is ahead of schedule.

- Recurring class generation (currently each occurrence is a manual row)
- Custom admin dashboard so the owner doesn't touch Supabase directly
- Email confirmation and reminders (booked, cancelled, class-tomorrow)
- Password reset and email verification
- Waitlists for classes that fill up
- Public deployment with a hosted frontend, backend, and Supabase project
- Payments, class packs, and drop-in pricing
- Instructor portal where teachers see their own classes and rosters
- Calendar view of the schedule, in addition to the list view
- Filtering by instructor, class type, or time of day
- Mobile-first redesign once usage patterns are clearer
- Multi-studio support so the same app can host more than one studio

## Out Of Scope For MVP

- Custom admin dashboard (studio owner uses Supabase directly)
- Password reset and email verification
- Payments
- Recurring class generation (each occurrence is a manual row)
- Notifications, reminders, and waitlists
- Instructor portal
- Public deployment
- Calendar view, filtering, or other advanced schedule UI
- Multi-tenant or multi-studio support
