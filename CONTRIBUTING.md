# Contributing

Engineering practices for this project. Both the author and any AI assistants helping with this codebase should follow these conventions. For the *what to build* and *what not to build* rules, see `AGENTS.md` — this document covers *how* changes get committed and reviewed.

## Before You Commit

- Confirm the change is in scope for the **current version** (see `AGENTS.md` — v1 ships before v2 work begins).
- Don't commit `.env`. If a new env var is needed, add it to `.env.example` in the same commit.
- If the change touches the `GET /api/classes` shape or any other API surface used by the client, plan a matching PR in `../flowlist-client`.

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) spec: `<type>(<scope>): <short description>`

### Common types

- `feat` — new feature
- `fix` — bug fix
- `chore` — maintenance, config, tooling
- `docs` — documentation only
- `refactor` — code change that isn't a fix or feature
- `test` — adding or updating tests
- `style` — formatting, no logic change

### Scopes (typical)

`classes`, `auth`, `sessions`, `bookings`, `db`, `health`, `deps`, `readme`, `tests`. Use the lowercase area of the codebase the change touches; if it touches several, drop the scope.

### Examples

- `feat(classes): add GET /api/classes endpoint`
- `feat(health): include database round-trip latency in response`
- `fix(db): retry Supabase connection on cold start`
- `fix(classes): join class_templates so name and description appear in response`
- `chore(deps): upgrade express to 5.2.1`
- `docs(readme): document required Supabase env vars`
- `refactor(sessions): extract session lookup into middleware module`
- `test(bookings): add 409-on-double-booking test`

### Rules

- Keep the subject line under 72 characters.
- Use the imperative mood — "add", not "added" or "adds".
- Lowercase after the colon.
- No period at the end.

This follows the Conventional Commits spec, which is the most common standard in professional projects.

## Pull Request Description Format

When opening a pull request, use the following format:

```md
## Summary
Briefly explain what this pull request does.

## Changes
- List the main changes made in this PR
- Keep each bullet short and specific
- Focus on what changed, not every tiny implementation detail

## Testing
- Explain how the change was tested
- If no tests were run, explain why
```

### Example

```md
## Summary
Adds the public class schedule endpoint for v1.

## Changes
- Adds GET /api/classes joining class_events with class_templates
- Returns name, description, starts_at, duration_minutes, instructor
- Uses the existing src/config/db.ts connection

## Testing
- Verified in Postman against three sample rows in Supabase
- Visual verification (the React schedule page) deferred to flowlist-client
```

## Code Comment Guidelines

1. Comment **why**, not just **what**.
2. Use comments only for **non-obvious logic**, not every simple line.
3. Prefer **short comments above a block** instead of line-by-line narration.
4. Keep comments **brief, specific, and direct**.
5. Use comments to explain **flow, intent, business rules, or edge cases**.
6. Avoid comments that simply **repeat the code**.
7. Prefer **clear function and variable names** before adding extra comments.
8. Use comments to explain **important assumptions** and **security-sensitive behavior** (e.g. why a route bypasses session middleware, why a query uses `UPDATE … WHERE spots_remaining > 0`).
9. Remove or tighten **temporary learning comments** before finishing the file.
10. Keep comment style **consistent** across the project.
11. Update comments whenever the code changes so they do not go stale.
12. When a section needs too much explanation, consider **extracting a helper function** instead of adding more comments.
