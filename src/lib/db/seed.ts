// Demo accounts (BUILD_PLAN Phase 1). Safe to run more than once.
// Usage: npm run db:seed
import { hashPassword } from '@/lib/auth/password';
import { db } from './index';
import { users } from './schema';

const PASSWORD = 'Demo@1234';

const accounts = [
  { name: 'Demo Customer', email: 'customer@demo.com', role: 'customer' as const },
  { name: 'Demo Staff', email: 'staff@demo.com', role: 'staff' as const },
  { name: 'Demo Manager', email: 'manager@demo.com', role: 'manager' as const },
  { name: 'Demo Admin', email: 'admin@demo.com', role: 'admin' as const },
];

async function main() {
  const passwordHash = await hashPassword(PASSWORD);
  const inserted = await db
    .insert(users)
    .values(accounts.map((a) => ({ ...a, passwordHash })))
    .onConflictDoNothing({ target: users.email })
    .returning({ email: users.email });

  console.log(`Seeded ${inserted.length} new account(s). All demo accounts use password ${PASSWORD}:`);
  for (const a of accounts) console.log(`  ${a.role.padEnd(8)} ${a.email}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
