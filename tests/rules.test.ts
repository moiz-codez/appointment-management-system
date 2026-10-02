import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { departments, rules } from '@/lib/db/schema';
import { getRule, RULE_DEFAULTS } from '@/lib/services/rules';

let deptA: string;
let deptB: string;

beforeEach(async () => {
  await db.execute(sql`truncate table rules, departments cascade`);
  [{ id: deptA }, { id: deptB }] = await db
    .insert(departments)
    .values([
      { name: 'Dept A', code: 'DA' },
      { name: 'Dept B', code: 'DB' },
    ])
    .returning({ id: departments.id });
});

describe('getRule override order (§10)', () => {
  it('falls back to the code default', async () => {
    expect(await getRule('maxRecalls', deptA)).toBe(RULE_DEFAULTS.maxRecalls);
    expect(await getRule('maxRecalls')).toBe(RULE_DEFAULTS.maxRecalls);
  });

  it('org rule overrides the default', async () => {
    await db.insert(rules).values({ scope: 'org', key: 'maxRecalls', value: 4 });
    expect(await getRule('maxRecalls', deptA)).toBe(4);
    expect(await getRule('maxRecalls')).toBe(4);
  });

  it('department rule overrides the org rule, only for that department', async () => {
    await db.insert(rules).values([
      { scope: 'org', key: 'maxRecalls', value: 4 },
      { scope: 'department', departmentId: deptA, key: 'maxRecalls', value: 1 },
    ]);
    expect(await getRule('maxRecalls', deptA)).toBe(1);
    expect(await getRule('maxRecalls', deptB)).toBe(4);
    expect(await getRule('maxRecalls')).toBe(4);
  });

  it('only one org row per key', async () => {
    await db.insert(rules).values({ scope: 'org', key: 'maxRecalls', value: 4 });
    await expect(db.insert(rules).values({ scope: 'org', key: 'maxRecalls', value: 5 })).rejects.toThrow();
  });
});
