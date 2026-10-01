'use server';

import { redirect } from 'next/navigation';
import { createSession, deleteSession, ROLE_HOME } from '@/lib/auth/session';
import { run, type ActionResult } from '@/lib/errors';
import * as users from '@/lib/services/users';
import { LoginSchema, RegisterSchema } from '@/lib/validation';

export async function login(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  return run(async () => {
    const user = await users.authenticate(LoginSchema.parse(input));
    await createSession({ userId: user.id, role: user.role });
    return { redirectTo: ROLE_HOME[user.role] };
  });
}

export async function register(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  return run(async () => {
    const user = await users.register(RegisterSchema.parse(input));
    await createSession({ userId: user.id, role: user.role });
    return { redirectTo: ROLE_HOME.customer };
  });
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
