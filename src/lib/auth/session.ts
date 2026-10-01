import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import type { Role } from '@/lib/db/schema';

export const SESSION_COOKIE = 'session';
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const ROLE_HOME: Record<Role, string> = {
  customer: '/customer',
  staff: '/staff',
  manager: '/manager',
  admin: '/admin',
};

export interface SessionPayload {
  userId: string;
  role: Role;
}

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be set (32+ characters)');
  return new TextEncoder().encode(secret);
}

// Pure helpers (no request context) - also used by the proxy and tests.
export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return { userId: String(payload.userId), role: payload.role as Role };
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  (await cookies()).set(SESSION_COOKIE, await encrypt(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readSession() {
  return decrypt((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
