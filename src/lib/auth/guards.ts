import type { Role } from '@/lib/db/schema';
import { AppError } from '@/lib/errors';
import { findActiveUser, type PublicUser } from '@/lib/services/users';
import { readSession } from './session';

// The real authorization check (CLAUDE.md §5). The proxy only handles redirects.
// Re-reads the user each time so suspensions and role changes apply immediately.
export async function requireUser(): Promise<PublicUser> {
  const session = await readSession();
  const user = session ? await findActiveUser(session.userId) : null;
  if (!user) throw new AppError('FORBIDDEN', 'Please sign in to continue', 401);
  return user;
}

export function assertRole(user: PublicUser, roles: Role[]): PublicUser {
  if (!roles.includes(user.role)) throw new AppError('FORBIDDEN', 'You do not have access to this', 403);
  return user;
}

export async function requireRole(...roles: Role[]): Promise<PublicUser> {
  return assertRole(await requireUser(), roles);
}
