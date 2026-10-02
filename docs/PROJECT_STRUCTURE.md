# Project Structure — Digital Queue & Appointment Management System

A single Next.js application: the web pages for customers, staff, managers and admins, plus all business logic and the PostgreSQL database access. This document explains how it is organised (brief §12).

## How the parts connect

```
Browser (pages / client components)
   │  form submit or button click
   ▼
Server actions (src/actions)  ─ or ─  API routes (src/app/api, only for health / live polling / push)
   │  1. check who is signed in and their role   2. validate input with Zod
   ▼
Business logic (src/lib/services)        ← all rules live here
   ▼
Database access (src/lib/db, Drizzle ORM) → PostgreSQL
```

- Pages never query the database or contain business rules; they display data and call actions.
- Every action and route checks the user's role itself (`src/lib/auth/guards.ts`). `src/proxy.ts` only redirects (signed out → `/login`, wrong area → own home).
- Errors are returned as `{ ok: false, error: { code, message } }` and shown as a toast.

## Folders and important files

| Path | Purpose |
|---|---|
| `docs/` | The brief, the build plan and this document |
| `drizzle/` | Generated SQL migrations (applied on every deploy before the app starts) |
| `docker-compose.yml` | Local PostgreSQL with a development and a test database |
| `railway.json` | Deployment: build command, migrate-then-start, `/api/health` health check |
| `tests/` | Vitest tests, run against the separate test database |
| `src/proxy.ts` | Redirects by sign-in state and role (Next.js 16 name for middleware) |
| `src/app/(auth)/` | Login and registration pages |
| `src/app/customer/` | Customer pages: browse and search departments and services |
| `src/app/staff/`, `manager/`, `admin/` | Role areas (filled in later phases) |
| `src/app/api/health/` | Health check: confirms the app can reach the database |
| `src/actions/` | Server actions, one file per area: guard → validate → call a service |
| `src/components/app-shell.tsx` | Shared header for signed-in pages: logo, user, role, logout |
| `src/components/ui/` | shadcn/ui components (generated, not hand-edited) |
| `src/lib/db/schema.ts` | All database tables |
| `src/lib/db/seed.ts` | Demo organisation and one account per role |
| `src/lib/auth/` | Password hashing, signed session cookie, role guards |
| `src/lib/services/` | Business logic (see below) |
| `src/lib/errors.ts` | `AppError` and the `run()` helper that turns errors into user messages |
| `src/lib/time.ts` | The single clock (`now()`), so tests can freeze time |
| `src/lib/validation.ts` | Shared Zod input schemas |

## Business logic — `src/lib/services/`

| File | What it does |
|---|---|
| `users.ts` | Register customers, check login passwords, load the signed-in user |
| `rules.ts` | Organisation rules (§10): a department setting overrides the organisation setting, which overrides the built-in default |
| `catalog.ts` | Lists active departments and services for customers, with search by department or service name (§9) |

Appointment logic (`slots.ts`, `appointments.ts`) and queue logic (`queue.ts`, `wait-time.ts`, `counters.ts`) are added in Phases 3–5.

## Feature → files

| Feature | Files |
|---|---|
| Sign in, register, sign out, roles | `src/actions/auth.ts`, `src/lib/services/users.ts`, `src/lib/auth/*`, `src/proxy.ts`, `src/app/(auth)/*` |
| Departments, services, counters, slot settings | `src/lib/db/schema.ts`, `src/lib/db/seed.ts` |
| Organisation rules | `src/lib/services/rules.ts` (tested in `tests/rules.test.ts`) |
| Browse and search services | `src/lib/services/catalog.ts`, `src/app/customer/page.tsx` (tested in `tests/catalog.test.ts`) |
