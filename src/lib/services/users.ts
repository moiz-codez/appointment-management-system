import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, type User } from '@/lib/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { AppError } from '@/lib/errors';
import type { LoginInput, RegisterInput } from '@/lib/validation';

export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'departmentId' | 'accountStatus'>;

function toPublic(u: User): PublicUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role, departmentId: u.departmentId, accountStatus: u.accountStatus };
}

// Self-registration always creates a customer (§2); other roles are created by an admin.
export async function register(input: RegisterInput): Promise<PublicUser> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) throw new AppError('VALIDATION', 'An account with this email already exists', 409);

  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      role: 'customer',
    })
    .returning();
  return toPublic(user);
}

export async function authenticate(input: LoginInput): Promise<PublicUser> {
  const user = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  // Same message for unknown email and wrong password, so accounts can't be probed.
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError('FORBIDDEN', 'Incorrect email or password', 401);
  }
  if (user.accountStatus !== 'active') {
    throw new AppError('FORBIDDEN', 'This account is not active. Please contact the administrator.', 403);
  }
  return toPublic(user);
}

export async function findActiveUser(id: string): Promise<PublicUser | null> {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  return user && user.accountStatus === 'active' ? toPublic(user) : null;
}
