// Demo organisation + accounts (BUILD_PLAN Phases 1-2). Safe to run more than once:
// rows are matched by their unique name/code/email; manager-editable settings are not overwritten.
// Usage: npm run db:seed
import { count } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/password';
import type { BreakWindow, WorkingHours } from './schema';
import { db } from './index';
import { counters, counterServices, departments, services, slotConfigs, users } from './schema';

const PASSWORD = 'Demo@1234';

// Mon-Fri 9 AM - 5 PM with a 1-2 PM break (Karachi local time).
const WEEKDAYS = [1, 2, 3, 4, 5];
const HOURS: WorkingHours = Object.fromEntries(WEEKDAYS.map((d) => [String(d), { open: '09:00', close: '17:00' }]));
const BREAKS: BreakWindow[] = [{ start: '13:00', end: '14:00', days: WEEKDAYS }];

const DEPARTMENTS = [
  {
    name: 'Examination',
    code: 'EXM',
    services: [
      { name: 'Document Verification', code: 'A', averageDurationMin: 10 },
      { name: 'Certificate Verification', code: 'C', averageDurationMin: 10 },
    ],
    counters: [
      { name: 'Counter 1', staff: 'staff@demo.com', services: ['A'] },
      { name: 'Counter 2', staff: 'staff2@demo.com', services: ['A', 'C'] },
    ],
  },
  {
    name: 'Student Affairs',
    code: 'STA',
    services: [
      { name: 'Document Collection', code: 'B', averageDurationMin: 5 },
      { name: 'New Registration', code: 'D', averageDurationMin: 20 },
    ],
    counters: [
      { name: 'Counter 3', staff: 'staff3@demo.com', services: ['B', 'D'] },
      { name: 'Counter 4', staff: 'staff4@demo.com', services: ['D'] },
    ],
  },
  {
    name: 'Accounts',
    code: 'ACC',
    services: [{ name: 'Fee Queries', code: 'F', averageDurationMin: 5 }],
    counters: [
      { name: 'Counter 5', staff: 'staff5@demo.com', services: ['F'] },
      { name: 'Counter 6', staff: 'staff6@demo.com', services: ['F'] },
    ],
  },
];

const SLOT = { slotLengthMin: 30, maxPerSlot: 6, dailyLimit: 60 };

async function main() {
  const passwordHash = await hashPassword(PASSWORD);

  await db.transaction(async (tx) => {
    const deptIds: Record<string, string> = {};
    for (const d of DEPARTMENTS) {
      const [row] = await tx
        .insert(departments)
        .values({ name: d.name, code: d.code, workingHours: HOURS, breakWindows: BREAKS })
        .onConflictDoUpdate({ target: departments.code, set: { name: d.name } })
        .returning({ id: departments.id });
      deptIds[d.code] = row.id;
    }

    const accounts = [
      { name: 'Demo Customer', email: 'customer@demo.com', role: 'customer' as const, departmentId: null },
      { name: 'Demo Admin', email: 'admin@demo.com', role: 'admin' as const, departmentId: null },
      { name: 'Demo Manager', email: 'manager@demo.com', role: 'manager' as const, departmentId: deptIds.EXM },
      ...DEPARTMENTS.flatMap((d) =>
        d.counters.map((c) => ({
          name: `Staff ${c.name}`,
          email: c.staff,
          role: 'staff' as const,
          departmentId: deptIds[d.code],
        }))
      ),
    ];
    const userIds: Record<string, string> = {};
    for (const a of accounts) {
      const [row] = await tx
        .insert(users)
        .values({ ...a, passwordHash })
        .onConflictDoUpdate({ target: users.email, set: { departmentId: a.departmentId } })
        .returning({ id: users.id });
      userIds[a.email] = row.id;
    }

    const serviceIds: Record<string, string> = {};
    for (const d of DEPARTMENTS) {
      for (const s of d.services) {
        const [row] = await tx
          .insert(services)
          .values({ ...s, departmentId: deptIds[d.code] })
          .onConflictDoUpdate({ target: services.code, set: { departmentId: deptIds[d.code] } })
          .returning({ id: services.id });
        serviceIds[s.code] = row.id;
        await tx.insert(slotConfigs).values({ serviceId: row.id, ...SLOT }).onConflictDoNothing();
      }
    }

    for (const d of DEPARTMENTS) {
      for (const c of d.counters) {
        const [row] = await tx
          .insert(counters)
          .values({ name: c.name, departmentId: deptIds[d.code], assignedStaffId: userIds[c.staff], status: 'available' })
          .onConflictDoUpdate({
            target: counters.name,
            set: { departmentId: deptIds[d.code], assignedStaffId: userIds[c.staff] },
          })
          .returning({ id: counters.id });
        await tx
          .insert(counterServices)
          .values(c.services.map((code) => ({ counterId: row.id, serviceId: serviceIds[code] })))
          .onConflictDoNothing();
      }
    }
  });

  const totals = await Promise.all(
    [departments, services, counters, counterServices, slotConfigs, users].map(async (t) => (await db.select({ n: count() }).from(t))[0].n)
  );
  const [d, s, c, cs, sc, u] = totals;
  console.log(`Departments ${d}, services ${s}, counters ${c} (${cs} service links), slot configs ${sc}, users ${u}.`);
  console.log(`Demo accounts (password ${PASSWORD}): customer@, staff@ (Counter 1), staff2-6@ (Counters 2-6), manager@ (Examination), admin@ - all @demo.com`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
