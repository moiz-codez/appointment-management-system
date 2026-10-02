import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { departments, services } from '@/lib/db/schema';
import { listCatalog } from '@/lib/services/catalog';

beforeEach(async () => {
  await db.execute(sql`truncate table services, departments cascade`);
  const [exam, accounts, closed] = await db
    .insert(departments)
    .values([
      { name: 'Examination', code: 'EXM' },
      { name: 'Accounts', code: 'ACC' },
      { name: 'Closed Dept', code: 'CLD', active: false },
    ])
    .returning({ id: departments.id });
  await db.insert(services).values([
    { departmentId: exam.id, name: 'Document Verification', code: 'A', averageDurationMin: 10 },
    { departmentId: exam.id, name: 'Certificate Verification', code: 'C', averageDurationMin: 10 },
    { departmentId: exam.id, name: 'Retired Service', code: 'R', averageDurationMin: 5, active: false },
    { departmentId: accounts.id, name: 'Fee Queries', code: 'F', averageDurationMin: 5 },
    { departmentId: closed.id, name: 'Hidden', code: 'H', averageDurationMin: 5 },
  ]);
});

describe('listCatalog (§9 search)', () => {
  it('lists active departments and services only', async () => {
    const catalog = await listCatalog();
    expect(catalog.map((d) => d.name)).toEqual(['Accounts', 'Examination']);
    expect(catalog[1].services.map((s) => s.code)).toEqual(['A', 'C']);
  });

  it('filters by service name, case-insensitive', async () => {
    const catalog = await listCatalog('  VERIFICATION ');
    expect(catalog).toHaveLength(1);
    expect(catalog[0].services.map((s) => s.code)).toEqual(['A', 'C']);
    expect((await listCatalog('fee'))[0].services.map((s) => s.code)).toEqual(['F']);
  });

  it('a department-name match shows all its services', async () => {
    const catalog = await listCatalog('exam');
    expect(catalog[0].services.map((s) => s.code)).toEqual(['A', 'C']);
  });

  it('returns nothing for no match', async () => {
    expect(await listCatalog('passport')).toEqual([]);
  });
});
