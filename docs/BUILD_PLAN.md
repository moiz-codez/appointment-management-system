# BUILD_PLAN.md — Next.js build plan (solo)

How to use this file:
- Work top to bottom, one phase at a time. Each phase is a **vertical slice**: services + tests, then actions/routes, then pages, then you try it in the browser.
- Each phase has a **prompt** to paste into Claude Code, a checklist (Claude Code ticks boxes as it finishes), and **Done when** checks that *you* do yourself.
- Start every session from the repo root with:
  *"Read CLAUDE.md and docs/BUILD_PLAN.md. We are on Phase N."*
  If a session gets long or confused: `/clear`, then the same line again. This file is the memory, not the chat.
- **Phases 1–6 = the minimum demo.** 7 = dashboard + management. 8 = push + installable. 9 = AI. 10 = ship. If time runs out, cut from the end — never from 1–6.

---

## Phase 0 — Setup (you, by hand)

- [x] Install Node.js 20 LTS or newer, Docker Desktop, Git, Claude Code.
- [x] Create the app in the repo root (empty folder or freshly cloned empty repo):
  ```bash
  npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
  npx shadcn@latest init
  ```
- [x] Put `CLAUDE.md` in the root and `docs/BRIEF.md` + `docs/BUILD_PLAN.md` in `docs/`.
- [x] Git identity: `git config --global user.name "moiz-codez"` and `git config --global user.email "<your GitHub email>"`.
- [x] Commit this starting state to `main` and push. From now on Claude Code only works on `dev`.
- [ ] Optional: GitHub → Settings → Branches → protect `main` (require a PR).
- [x] Create a Railway account (you'll connect the repo in Phase 1).

---

## Phase 1 — Foundation: database, auth, roles, deploy

**Prompt:**
> Read CLAUDE.md, docs/BRIEF.md and docs/BUILD_PLAN.md. We are on Phase 1. First run the git start-of-session steps (create `dev` if it doesn't exist). Then plan Phase 1 and wait for my OK before writing code.

- [x] `docker-compose.yml` (dev DB + test DB), `.env.example`, npm scripts (`db:*`, `typecheck`, `test`)
- [x] Drizzle setup: `lib/db/index.ts`, `drizzle.config.ts`, `users` table, first migration
- [x] `lib/time.ts`, `lib/errors.ts`, `ActionResult` + `run()` helper
- [x] Auth: `lib/auth/password.ts`, `session.ts` (jose cookie), `guards.ts` (`requireUser`, `requireRole`); register (customers only), login, logout actions
- [x] `middleware.ts`: not logged in → `/login`; wrong role → own home
- [x] `/login`, `/register`, and four placeholder homes (`/customer`, `/staff`, `/manager`, `/admin`) inside a simple `AppShell` (title, role, logout)
- [x] `lib/db/seed.ts` with demo accounts: `customer@demo.com`, `staff@demo.com`, `manager@demo.com`, `admin@demo.com`, all `Demo@1234`
- [x] `/api/health`
- [x] Vitest set up against the test DB; tests: login ok, wrong password, role guard
- [x] Deploy to Railway: Next.js service from the `dev` branch + Railway Postgres; build `npm run build`, start `npm run db:migrate && npm start`; set env vars; run the seed once

**Done when:** on the Railway URL, from your phone and laptop, each demo account logs in and lands on its own home; a customer typing `/admin` gets bounced; a wrong password shows a readable error.

---

## Phase 2 — Organisation & service browsing

**Prompt:**
> We are on Phase 2. Plan, wait for OK, then build.

- [x] Schema: `departments`, `services`, `counters`, `counterServices`, `slotConfigs`, `rules`, `activityLogs`
- [x] `lib/services/rules.ts` (`getRule` with defaults)
- [x] Seed: departments Examination, Student Affairs, Accounts; services Document Verification (`A`, 10 min), Document Collection (`B`, 5), Certificate Verification (`C`, 10), New Registration (`D`, 20), Fee Queries (`F`, 5); 2–3 counters per department mapped to services; staff accounts assigned to counters; working hours 9 AM–5 PM with a 1–2 PM break; slot configs
- [x] Customer `/customer`: departments → services, with a search box (§9). Each service shows **Book appointment** and **Get token** (wired up in Phases 3–4)
- [x] Tests: `getRule` override order

**Done when:** on your phone, as the customer, you can browse every seeded department and service and filter by name.

---

## Phase 3 — Appointments

**Prompt:**
> We are on Phase 3. Plan, wait for OK. Build slots.ts and appointments.ts with tests (including the concurrency test) before any UI.

- [ ] Schema: `appointments` + partial unique index; appointment transition table
- [ ] `slots.ts`: generate slots from hours − breaks, stepped by slot length; `{ start, end, max, booked, status }`
- [ ] `appointments.ts`: book (advisory lock, capacity, daily limit, duplicate + per-user limits), cancel (limit rule), reschedule
- [ ] `/customer/book/[serviceId]`: date picker → slot list showing `booked/max` and Full/Available → confirm dialog → appointment number
- [ ] `/customer/visits`: appointments with status badges; Cancel and Reschedule
- [ ] Tests: slot math across the break; **20 parallel bookings on a 6-seat slot → exactly 6** (run 3 times); duplicate rejected; cancel frees capacity

**Done when:** you book from your phone, see it in My visits, cancel it, and the slot count drops back. A full slot can't be booked and says so.

---

## Phase 4 — Walk-in tokens, queue, waiting time

**Prompt:**
> We are on Phase 4. Plan, wait for OK. Build queue.ts and wait-time.ts exactly as CLAUDE.md §8 says, with tests, then the token page with SWR polling. Explain the ordering back to me in plain words when done.

- [ ] Schema: `tokens`, `tokenSequences`, `queueEvents` + partial unique index; token transition table
- [ ] `queue.ts`: create token (atomic numbering, duplicate + `maxTokensPerUser`), cancel, `orderedQueue()`, position
- [ ] `wait-time.ts`: estimate per §8
- [ ] **Get token** action → redirect to `/customer/token/[id]`: big token number, current token, people ahead, estimated wait, status; polls `/api/live/token/[id]` every 3 s; Cancel
- [ ] Active token card at the top of My visits
- [ ] Tests: numbering `A-001…` + daily reset; ordering; **5 × 4 ÷ 2 = 10**; 20 parallel tokens → unique gap-free numbers; duplicate rejected

**Done when:** three customers (register two more in incognito windows) take tokens for Document Verification → `A-001`, `A-002`, `A-003`, and the third shows 2 ahead with an estimate.

---

## Phase 5 — Staff console, counters, display screen

**Prompt:**
> We are on Phase 5. Plan, wait for OK, then services + tests, then the staff console and the display page.

- [ ] `queue.ts`: call next (via `orderedQueue` across the counter's services), start, complete, skip, recall (limit → missed), miss; appointment-sourced tokens update their appointment
- [ ] `counters.ts`: status changes; a closed/paused counter returns its called token to the front
- [ ] `/staff`: one page — counter name + status select, current token card (Start, Complete, Recall, Skip, Mark missed), big **Call next**, waiting list below; polls every 3 s
- [ ] `/display/[departmentId]` (public): full-screen "Now Serving" — last 5 called `token → counter`, very large text; polls every 3 s. A department picker at `/display`.
- [ ] Tests: §7 sequence Called → No Response → Recalled → Missed; closing a counter raises estimates; called token returns to front

**Done when:** staff on your laptop, customer on your phone, display on a second tab. Call next → the phone and display update within 3 s; complete → the next person's position drops; closing a counter makes the estimate jump.

---

## Phase 6 — Check-in, reminders, in-app notifications

**Prompt:**
> We are on Phase 6. Plan, wait for OK. Check-in with the window rule, lazy + timer expiry, jobs.ts and instrumentation.ts, notifier.ts with in-app notifications only (no push yet), then the check-in button and the notifications bell/page.

- [ ] `appointments.checkIn` → creates an appointment token; `OUTSIDE_CHECKIN_WINDOW`
- [ ] `expireMissedAppointments()` called on reads + by the timer; frees capacity; notifies
- [ ] `jobs.ts` + `instrumentation.ts`: reminders (30 and 10 min before), "you're 3rd in line"; idempotent; starts once
- [ ] `notifications` table; `notifier.notify()` for all §10 triggers
- [ ] Bell in `AppShell` with unread count (polls 10 s) → `/notifications` (mark read)
- [ ] Check in button on appointments (server decides if allowed)
- [ ] Tests with frozen time: check-in at −11 / −10 / +10 / +11 min; expiry frees capacity; each trigger creates a row

**Done when:** the full brief flow works on the deployed URL — book → check in → called → served → completed, and walk-in → token → called → completed — with notifications at each step.
**This is your minimum demo. Record a rough backup video now.**

---

## Phase 7 — Dashboard, analytics, management pages

**Prompt:**
> We are on Phase 7. Plan, wait for OK. analytics.ts per brief §9 with tests on a small known dataset, then the dashboard component and the manager/admin management pages.

- [ ] `analytics.ts`: summary (all §9 numbers, matching the §9 example) + series (queue length by hour, wait by service/department, staff workload, completion time, cancellation rate, no-show rate, daily/weekly visitors); appointment search (§9)
- [ ] `<Dashboard scope>` component: stat card grid + 3 Recharts charts; `/manager` (own department) and `/admin` (org-wide); polls `/api/live/dashboard` every 10 s
- [ ] `/manager/services`, `/manager/counters`, `/manager/settings`: tables + add/edit dialogs (react-hook-form not needed — plain forms + zod)
- [ ] `/admin/departments`, `/admin/users`: tables + add/edit dialogs; admin activity log list
- [ ] Every management action writes `activityLogs`

**Done when:** after a run through the demo flow, the dashboard numbers match what you did, and a service added as manager appears for the customer.

---

## Phase 8 — Web Push + installable app

**You first:** generate VAPID keys once (`npx web-push generate-vapid-keys`) and add them to `.env.local` and Railway.

**Prompt:**
> We are on Phase 8. Plan, wait for OK. pushSubscriptions table, /api/push/subscribe and /unsubscribe, web-push sending in notifier.ts per CLAUDE.md §9, public/sw.js, an "Enable notifications" button for customers, and manifest.webmanifest with icons so Android can install it.

- [ ] `pushSubscriptions` table; subscribe/unsubscribe routes; dead-subscription cleanup
- [ ] `public/sw.js` (show + click → open url); register it on the client
- [ ] "Enable notifications" button (permission prompt must come from a click)
- [ ] `manifest.webmanifest` + icons; "Add to Home screen" works on Android Chrome

**Done when:** on your Android phone, enable notifications, **close the tab**, have staff call your token → the notification appears; tapping it opens the token page.

---

## Phase 9 — AI features (only what time allows)

**Prompt for data first:**
> We are on Phase 9. Write src/lib/db/seed-history.ts: ~60 days of realistic history through the real services/tables (busy 11 AM–1 PM, heavier Mondays, ~15% no-shows with some repeat offenders, durations scattered around each service's average, some counters closed some days), fixed random seed, prints summary stats.

**Then one file per prompt, in order, stopping when time runs out:**
> Implement src/lib/ai/<file>.ts per CLAUDE.md §10 with its fallback and a test, show me output on the seeded history, then add its card to the dashboard.

- [ ] `seed-history.ts`
- [ ] `peak-hours`
- [ ] `insights` (needs `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL`)
- [ ] `demand-forecast`
- [ ] `staff-recommender`
- [ ] `no-show` (badge on appointments in staff/manager views)
- [ ] `wait-predictor` (behind a setting, formula fallback)
- [ ] `queue-optimizer`

**Done when:** every finished card shows sensible output, and with the API key removed everything still works (insights fall back to templates).

---

## Phase 10 — Ship

**Prompt:**
> We are on Phase 10. First review the whole app against docs/BRIEF.md §1–§12 and list gaps — change nothing yet. Then: confirm every action/route has its role guard and customers only see their own data, add rate limiting to login/register, write README.md (setup, demo accounts, URL), and finish docs/PROJECT_STRUCTURE.md.

- [ ] Gap review against the brief
- [ ] Security pass: guards everywhere, data scoping, login rate limit
- [ ] `README.md`: what it is, stack, local setup, demo accounts, live URL
- [ ] `docs/PROJECT_STRUCTURE.md`: important folders/files and purpose, where appointment & queue logic is, where AI is, how pages → actions/routes → services → database connect → export to PDF for submission
- [ ] Fresh Railway deploy from an empty database: migrate → seed → seed-history
- [ ] Full demo flow on a phone that has never opened the site
- [ ] You merge `dev → main` (PR on GitHub)

**Demo video** (§12):
1. Customer books an appointment (show a Full slot)
2. Another customer takes a walk-in token → number, people ahead, estimate
3. Display screen showing the live queue
4. Staff closes a counter → the customer's estimate jumps
5. Staff calls next → push on the phone with the tab closed + display updates; recall / skip / missed once
6. Customer checks in to the appointment → served → completed
7. Manager dashboard: numbers, charts, AI insights

**Submit:** video, GitHub link, deployed link, explanation document (PDF), demo accounts in the README.
