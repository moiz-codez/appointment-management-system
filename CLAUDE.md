# CLAUDE.md — Digital Queue & Appointment Management System (Next.js)

Hackathon project, built **solo** on a tight deadline. One Next.js app does everything: the web UI for customers, staff, managers, admins and a public display screen, plus all business logic and the database.

- Brief: `docs/BRIEF.md`. Section numbers like (§4) refer to it. When a requirement is unclear, check the brief, then ask.
- Plan: `docs/BUILD_PLAN.md`. Work one phase at a time; tick boxes as items are finished.
- `docs/PROJECT_STRUCTURE.md` becomes the submission explanation document (§12). After finishing a feature, add a line or two: which files implement it.

---

## 1. Priorities

Time is the main constraint. In order:

1. **The demo flow works end to end** on the deployed URL, on a phone and a laptop (§12 video checklist).
2. **Correctness of the parts judges test:** no overbooking, no duplicate tokens, correct queue order, correct wait estimate.
3. Everything else in the brief.
4. AI features, cheapest first.
5. Nothing beyond the brief unless I ask.

**The UI is deliberately plain:** shadcn/ui components with their default styling, no custom design system, no animations. The logic lives in `src/lib/services/`; pages just display data and call actions.

---

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router, `src/` dir), TypeScript strict, React Server Components by default |
| Database | PostgreSQL 16 (local via Docker, Railway in production) |
| ORM / migrations | Drizzle ORM + `drizzle-kit`, driver `postgres` (postgres.js) |
| Auth | Hand-rolled: email + password (`bcryptjs`), session = signed JWT (`jose`) in an httpOnly cookie. No Auth.js, no third-party auth. |
| Validation | Zod at every boundary (server actions, route handlers) |
| UI | Tailwind CSS + shadcn/ui, `lucide-react` icons |
| Charts | Recharts |
| Data fetching | Server Components for reads; Server Actions for mutations; SWR polling (`refreshInterval`) for live screens |
| Background jobs | In-process timer started from `src/instrumentation.ts` (runs on a long-running Node server) + lazy expiry on read |
| Notifications | In-app (DB rows, bell with unread count) + Web Push (`web-push`, VAPID, service worker) |
| Email | Optional, last: `nodemailer`, only if SMTP env vars are set |
| AI | Plain TypeScript statistics in `src/lib/ai/`; `@anthropic-ai/sdk` for the insights text |
| Tests | Vitest against a separate test database |
| Lint / format | ESLint (Next config) + Prettier |
| Hosting | **Railway**: one Next.js service (`next start`, always on) + Railway Postgres. Not Vercel — we need a long-running process for the job timer. |

Don't add dependencies outside this table without asking me and saying why.

---

## 3. Commands

```bash
npm install
docker compose up -d db              # local Postgres (+ test DB)
cp .env.example .env.local

npm run db:generate                  # drizzle-kit generate (after schema changes)
npm run db:migrate                   # apply migrations
npm run db:seed                      # demo org, departments, services, counters, one user per role
npm run db:seed-history              # ~60 days of synthetic history for analytics/AI (Phase 9)

npm run dev                          # http://localhost:3000
npm run lint && npm run typecheck    # typecheck = tsc --noEmit
npm test                             # vitest run
npm test -- concurrency              # run after ANY change to booking or token logic
npm run build                        # must pass before pushing
```

Before saying a task is done: `npm run lint`, `npm run typecheck`, `npm test`, and for UI work, open the page and use it.

---

## 4. Folder structure

```
/
├── CLAUDE.md
├── docs/                          # BRIEF.md, BUILD_PLAN.md, PROJECT_STRUCTURE.md
├── drizzle/                       # generated migrations (committed)
├── public/
│   ├── sw.js                      # service worker: shows push notifications, opens url on click
│   └── manifest.webmanifest       # installable PWA (name, icons, start_url)
├── tests/                         # vitest: services, transitions, concurrency, flow
├── docker-compose.yml             # local Postgres: dev DB + test DB
└── src/
    ├── middleware.ts              # redirects: not logged in → /login; wrong role → own home
    ├── instrumentation.ts         # starts the job timer once on server start
    ├── app/
    │   ├── (auth)/login, register
    │   ├── customer/              # services, book/[serviceId], visits, token/[id]
    │   ├── staff/                 # console
    │   ├── manager/               # dashboard, services, counters, settings
    │   ├── admin/                 # dashboard, departments, users
    │   ├── display/[departmentId] # public "Now Serving" (no login)
    │   ├── notifications/
    │   └── api/                   # ONLY what client polling / push / health need
    │       ├── health/
    │       ├── live/              # token/[id], counter/[id], display/[departmentId], dashboard
    │       ├── notifications/unread/
    │       └── push/              # subscribe, unsubscribe
    ├── actions/                   # server actions, one file per area — thin: auth check → zod → service
    ├── components/
    │   ├── ui/                    # shadcn generated components (don't hand-edit)
    │   └── ...                    # a few shared ones: StatCard, StatusBadge, LiveRefresh, AppShell
    └── lib/
        ├── db/                    # schema.ts, index.ts, seed.ts, seed-history.ts
        ├── auth/                  # password.ts, session.ts (create/read/delete cookie), guards.ts (requireUser, requireRole)
        ├── services/              # ALL business logic
        │   ├── slots.ts           # slot generation, capacity (§5)
        │   ├── appointments.ts    # book, cancel, reschedule, check-in, expiry (§3, §7)
        │   ├── queue.ts           # tokens, numbering, ordering, call/start/complete/skip/recall/miss (§3, §4, §7)
        │   ├── wait-time.ts       # estimate (§4)
        │   ├── counters.ts        # status, pause, redistribution (§6)
        │   ├── rules.ts           # org/department rules (§10)
        │   ├── notifier.ts        # in-app + web push + optional email (§7, §10)
        │   ├── analytics.ts       # dashboard metrics and series (§9)
        │   └── jobs.ts            # reminders, expiry — called by the timer
        ├── ai/                    # §11 features, one file each
        ├── errors.ts              # AppError(code, message, status)
        ├── time.ts                # now(), Karachi helpers — ALL time access goes through here
        └── validation.ts          # shared zod schemas
```

**Layering rule (this is what the explanation document will describe):**
`page / client component → server action or /api route → lib/services → lib/db`.
Pages and actions never touch the database directly and never contain business rules. The brief's "Appointment Manager" is `lib/services/appointments.ts` + `slots.ts`; its "Queue & Token Manager" is `lib/services/queue.ts` + `wait-time.ts` + `counters.ts`.

---

## 5. Roles (§2)

`customer`, `staff`, `manager`, `admin`. Every server action and route handler starts with `requireRole(...)`. Managers are scoped to their own `departmentId`; staff to their assigned counter. Admin is organisation-wide. `middleware.ts` handles redirects, but **the guard inside each action/handler is the real check** — never rely on middleware alone.

| Role | Can |
|---|---|
| customer | register, browse/search departments & services, view slots, book, join queue, view position & wait, cancel/reschedule, check in, history, notifications |
| staff | waiting list, call next, start, complete, skip, recall, mark missed, appointment details, counter status |
| manager | CRUD services, counters, staff assignment; working hours, breaks, slot length, capacity, daily limits, rules; dashboard for own department |
| admin | CRUD departments and users (any role); org-wide dashboard and activity |

---

## 6. Data model (Drizzle, `src/lib/db/schema.ts`)

Brief fields (§8) are required; the extras are needed for §3–§10. All timestamps are `timestamp with time zone`, stored in UTC.

- **users**: id, name, email (unique), phone, passwordHash, role, departmentId (nullable), accountStatus, createdAt
- **departments**: id, name, code, workingHours (jsonb per weekday), breakWindows (jsonb), active
- **services**: id, departmentId, name, code (token prefix, e.g. `A`), averageDurationMin, isPriority, active
- **counters**: id, departmentId, name, assignedStaffId, currentTokenId, status
- **counterServices**: counterId, serviceId (many-to-many)
- **slotConfigs**: serviceId, slotLengthMin, maxPerSlot, dailyLimit
- **appointments**: id, appointmentNumber, userId, serviceId, date, startTime, endTime, status, checkInTime, calledAt, serviceStartedAt, completedAt, counterId, rescheduledFromId, createdAt
- **tokens**: id, tokenNumber (e.g. `A-027`), userId (nullable), serviceId, source (`walk_in` | `appointment`), appointmentId, status, priority, recallCount, createdAt, calledAt, serviceStartedAt, completedAt, counterId
- **tokenSequences**: serviceId, date, lastNumber — primary key (serviceId, date)
- **rules**: id, scope (`org` | `department`), departmentId, key, value (jsonb)
- **notifications**: id, userId, type, title, body, url, readAt, createdAt
- **pushSubscriptions**: id, userId, endpoint (unique), p256dh, auth, createdAt
- **activityLogs**: id, actorId, action, entity, entityId, details (jsonb), createdAt
- **queueEvents**: id, tokenId, event (`created` | `called` | `no_response` | `recalled` | `skipped` | `missed` | `started` | `completed`), counterId, at — the history analytics and AI learn from

Queue position and estimated wait are **computed on read**, not stored, so they can never go stale.

Partial unique indexes (declare in Drizzle with `.where(...)`):
- one active appointment per user per service per day,
- one active token per user per service: `(userId, serviceId) WHERE status IN ('waiting','called','recalled','in_service')`.

---

## 7. State machines — enforce exactly

Each is an explicit transition table in code (`const ALLOWED: Record<Status, Status[]>`). Anything else throws `AppError('INVALID_TRANSITION', …, 409)`.

**Appointment (§3):**
```
booked → confirmed → checked_in → waiting → in_service → completed
booked/confirmed → cancelled
booked/confirmed → rescheduled   (new appointment linked by rescheduledFromId)
confirmed → missed               (check-in window passed)
waiting/in_service → delayed → waiting/in_service
```

**Token (§7):**
```
waiting → called → in_service → completed
called → no_response → recalled → called
called/recalled → skipped → waiting   (re-queued behind the next person)
no_response/recalled → missed
waiting → cancelled
```

**Counter (§6):** `available ↔ busy`, any → `break`, any → `closed`, `break/closed → available`.

Every transition writes a `queueEvents` row (tokens) or `activityLogs` row (everything else) **in the same transaction**.

---

## 8. Core business rules — the parts judges will test

**Queue model.** One queue per service per day, not per counter. Counters pull from the queues of the services they serve. Closing or pausing a counter therefore redistributes automatically (§4, §6). If a counter closes while it has a `called` token, that token goes back to the **front** of its queue.

**Ordering.** One function, `orderedQueue(serviceId)` in `queue.ts`, used everywhere. Sort waiting tokens by:
1. priority services / priority tokens first,
2. checked-in appointment tokens with `startTime <= now + 5 min`,
3. everything else by `createdAt`.

**Token numbers.** `{service.code}-{n padded to 3}`, e.g. `A-027`, resetting daily per service. Generate atomically in one statement — never "max + 1":
```sql
INSERT INTO token_sequences (service_id, date, last_number) VALUES ($1, $2, 1)
ON CONFLICT (service_id, date) DO UPDATE SET last_number = token_sequences.last_number + 1
RETURNING last_number;
```

**Waiting time (§4).**
```
avgDuration    = mean of the last 20 completed services for this service today,
                 falling back to services.averageDurationMin
activeCounters = counters serving this service with status available or busy
estimateMin    = ceil(peopleAhead × avgDuration / max(activeCounters, 1))
```
The brief's example must hold: 5 × 4 ÷ 2 = **10**. Keep a unit test for exactly this.

**Slots and capacity (§5).** Slots come from department working hours minus breaks, stepped by the service's `slotLengthMin`. A slot is full when booked ≥ `maxPerSlot`; also enforce `dailyLimit`. **No overbooking:** inside the booking transaction take `pg_advisory_xact_lock(hashtext(serviceId || date || startTime))`, then count, then insert.

**Time zone.** Pakistan is UTC+05:00 with no daylight saving. Build slot times as Karachi local and convert with the fixed offset in `lib/time.ts`; format for display with `Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi' })`. No date library needed.

**Check-in window (§7).** From 10 min before to 10 min after `startTime` (both are rules, default 10). Expiry is **lazy plus timer**: `expireMissedAppointments()` runs at the start of every slot/queue/appointment read and also every minute from the job timer. An expired appointment becomes `missed`, frees its slot capacity, and the customer is notified.

**No-shows.** `recall` increments `recallCount`; after `maxRecalls` (rule, default 2), the next no-response → `missed`.

**Rules (§10).** `getRule(key, departmentId)` — department overrides org, org overrides the defaults in code. Keys: `maxAppointmentsPerUserPerDay`, `maxTokensPerUser`, `cancellationLimit`, `earlyCheckinMinutes`, `lateCheckinMinutes`, `maxRecalls`, `priorityServices`.

---

## 9. Live updates, jobs, notifications

**Live screens poll** via SWR `refreshInterval: 3000` against `src/app/api/live/*` route handlers, which call the same services. Live screens: token page, staff console, display screen, dashboard, notification bell (10 s). Everything else is plain Server Components that refresh after actions (`revalidatePath` / `router.refresh()`).

**Job timer.** `instrumentation.ts` starts a single `setInterval` (60 s) calling `jobs.runAll()`: expire missed check-ins, send reminders (30 and 10 min before), "you're 3rd in line" alerts. Guard so it starts once; make every job idempotent (safe to run twice).

**Notifier.** `notify(userId, type, payload)` always writes a `notifications` row, then sends Web Push to every `pushSubscriptions` row for that user, then email only if SMTP is configured. Triggers (§10): confirmed, approaching, position close, called to counter, rescheduled, delayed, cancelled.

**Web Push rules.**
- VAPID keys in env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:…`); expose the public key to the client as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- `public/sw.js` shows the notification and opens `payload.url` on click.
- Payload: `{ title, body, url, type }`, small.
- Send after the DB commit, never inside a transaction; failures are logged, never thrown to the user.
- Push service returns 404/410 → delete that subscription.
- No VAPID keys → skip push silently (log once). Everything else keeps working.
- No Firebase or any third-party push service.

---

## 10. AI features (§11) — `src/lib/ai/`

Each feature: one file, works on the synthetic history, has a non-AI fallback, is called from the manager/admin dashboard, and gets a "how it works" paragraph in `PROJECT_STRUCTURE.md`. Build in this order and stop when time runs out:

| File | Feature | Approach (simple and explainable) |
|---|---|---|
| `peak-hours.ts` | Peak-hour prediction | Group tokens + appointments by department × weekday × hour; return top hours/days. |
| `insights.ts` | AI management insights | Compute stats in TypeScript first, send ONLY those numbers to the Anthropic API (model from `ANTHROPIC_MODEL` env) to phrase 3–5 short insights. Fallback: template sentences. Never send names, emails or phones. Cache the result for 10 minutes. |
| `demand-forecast.ts` | Service demand forecasting | Per service, weekday-seasonal average of daily volume for the next 7 days. |
| `staff-recommender.ts` | Smart staff recommendation | Forecast arrivals per hour × average duration ÷ 60, rounded up → counters needed per hour. |
| `no-show.ts` | No-show prediction | Score from the user's past no-show rate, booking lead time, weekday and hour (weighted sum → 0–1). Badge on appointments. |
| `wait-predictor.ts` | Waiting-time prediction | Formula from §8 but with `avgDuration` taken from the same service + hour + weekday in history. Falls back to the plain formula. |
| `queue-optimizer.ts` | AI queue optimisation | For counters serving several services, recommend which queue each should pull from next: highest `peopleAhead × avgDuration ÷ activeCounters` first. |

---

## 11. Conventions

**Server actions** (`src/actions/*.ts`, `'use server'`):
```ts
export async function bookAppointment(input: unknown): Promise<ActionResult<{ appointmentNumber: string }>> {
  const user = await requireRole('customer');
  const data = BookSchema.parse(input);
  return run(() => appointments.book(user, data));   // run() turns AppError into { ok: false, error }
}
```
- Return `{ ok: true, data }` or `{ ok: false, error: { code, message } }` — never throw to the client. `message` is shown to the user as-is (toast), so write it for end users.
- Error codes: `SLOT_FULL`, `DUPLICATE_APPOINTMENT`, `DUPLICATE_TOKEN`, `LIMIT_REACHED`, `INVALID_TRANSITION`, `OUTSIDE_CHECKIN_WINDOW`, `OUTSIDE_WORKING_HOURS`, `SERVICE_CLOSED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`.

**Route handlers** (`src/app/api/**`): same guard + zod; JSON errors as `{ error: { code, message } }` with the right status.

**Services** take the acting user and plain data, return plain objects, and own their transactions (`db.transaction(async (tx) => …)`).

**Components:** Server Components by default. `'use client'` only for forms, buttons that call actions, and polling widgets. Every data view has loading, error and empty states. Disable buttons while their action runs; show results with a toast (shadcn `sonner`).

**Layout:** customer pages are mobile-first (customers use phones); staff/manager/admin pages are laptop-first but must not break on a phone; the display page is full-screen with very large text.

**Comments:** short, and name the brief section for non-obvious logic, e.g. `// §7: check-in window`.

**Secrets:** never commit `.env*` files (except `.env.example`), VAPID private key, or `ANTHROPIC_API_KEY`. Keep `.env.example` updated with every new variable.

---

## 12. Testing requirements

- Every transition table: allowed and rejected transitions.
- Wait-time example (5, 4, 2 → 10).
- `tests/concurrency.test.ts`: 20 simultaneous bookings on a `maxPerSlot = 6` slot → exactly 6 succeed; 20 simultaneous token requests → 20 unique, gap-free numbers; duplicate token requests for one user → exactly 1 succeeds.
- One flow test: select service → book / get token → position → estimate → staff calls → completed → analytics updated (§1, §11).
- Tests use the separate test database (`DATABASE_URL_TEST`), never the dev DB. Freeze time through `lib/time.ts`; never call `new Date()` directly outside it.

---

## 13. How to work

- Before a non-trivial task: state assumptions, a plan as short verifiable steps, and how each is checked. If something is ambiguous, ask instead of guessing.
- Build in **vertical slices**: service + tests → action/route → page → try it in the browser.
- Simplest thing that meets the brief. No speculative abstractions, no "for later" code.
- Keep changes surgical; don't refactor or restyle code you weren't asked to touch. Mention problems instead.

---

## 14. Git workflow

Solo repo. You work only on the `dev` branch. I merge `dev → main` myself.

**Start of every session:**
```bash
git fetch origin
git branch --show-current
```
- On `dev`: `git pull --ff-only origin dev`.
- `dev` exists on origin but not locally: `git switch dev`.
- `dev` doesn't exist yet (first session only): `git switch -c dev origin/main && git push -u origin dev`.
- Any other branch, or uncommitted changes you didn't make: stop and ask me.

**Allowed:** `status`, `diff`, `log`, `add`, `commit`, `push origin dev`, `pull --ff-only origin dev`.

**Never:** commit/push to `main`; merge, rebase or cherry-pick involving `main`; force-push; `reset --hard` on pushed commits; delete branches; rewrite history; open or merge PRs; `git add .` without checking `git status`; commit `.env*` (except `.env.example`), `node_modules/`, `.next/`.

If a pull fails or anything about git looks unexpected, stop and tell me.

**Commits:** one per finished checklist item or small logical change. Before committing: `npm run lint`, `npm run typecheck`, `npm test`. Check `git diff --staged`. Never change git config or pass `--author`.

**Message format** (Conventional Commits):
```
<type>(<scope>): <summary>

<optional body: what and why, wrapped at 72 chars>
```
- **type**: `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `chore`, `build`.
- **scope**: `auth`, `db`, `seed`, `slots`, `appointments`, `queue`, `tokens`, `wait-time`, `counters`, `rules`, `notifications`, `push`, `jobs`, `analytics`, `ai`, `customer`, `staff`, `manager`, `admin`, `display`, `ui`, `deploy`.
- **summary**: imperative ("add", not "added"), lowercase, no trailing period, ≤ 72 characters, describes the change.
- **body**: when not obvious; say why, mention the brief section.

Good: `feat(queue): generate daily token numbers atomically` · `fix(slots): exclude department break window` · `feat(staff): add call-next and recall buttons to console` · `test(appointments): assert 20 parallel bookings never exceed capacity`
Bad: `update`, `fixed bug`, `WIP`, `changes`, `Phase 3 done`.

**Push** to `origin dev` after every completed checklist item; list what you pushed in your reply. Railway auto-deploys from `dev`.
