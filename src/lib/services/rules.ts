import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rules } from '@/lib/db/schema';

// §10 organisation rules. Lookup order: department row → org row → these defaults.
export const RULE_DEFAULTS = {
  maxAppointmentsPerUserPerDay: 3,
  maxTokensPerUser: 2, // active tokens at the same time
  cancellationLimit: 3, // cancellations per user per day
  earlyCheckinMinutes: 10, // §7: check-in opens 10 min before
  lateCheckinMinutes: 10, // §7: and closes 10 min after
  maxRecalls: 2,
  priorityServices: [] as string[], // service ids served first
};

export type RuleKey = keyof typeof RULE_DEFAULTS;

export async function getRule<K extends RuleKey>(key: K, departmentId?: string | null): Promise<(typeof RULE_DEFAULTS)[K]> {
  const rows = await db
    .select({ scope: rules.scope, value: rules.value })
    .from(rules)
    .where(
      and(
        eq(rules.key, key),
        or(
          and(eq(rules.scope, 'org'), isNull(rules.departmentId)),
          departmentId ? and(eq(rules.scope, 'department'), eq(rules.departmentId, departmentId)) : undefined
        )
      )
    );

  const row = rows.find((r) => r.scope === 'department') ?? rows.find((r) => r.scope === 'org');
  return (row ? row.value : RULE_DEFAULTS[key]) as (typeof RULE_DEFAULTS)[K];
}
