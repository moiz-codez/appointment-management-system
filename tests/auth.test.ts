import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { assertRole } from '@/lib/auth/guards';
import { decrypt, encrypt } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { authenticate, register } from '@/lib/services/users';
import { RegisterSchema } from '@/lib/validation';

const alice = RegisterSchema.parse({ name: 'Alice', email: 'Alice@Example.com', password: 'secret-pass-1' });

beforeEach(async () => {
  await db.execute(sql`truncate table users cascade`);
});

describe('login', () => {
  it('accepts the right password (email is case-insensitive)', async () => {
    await register(alice);
    const user = await authenticate({ email: 'alice@example.com', password: 'secret-pass-1' });
    expect(user.email).toBe('alice@example.com');
    expect(user.role).toBe('customer');
  });

  it('rejects a wrong password with a readable error', async () => {
    await register(alice);
    const error = await authenticate({ email: 'alice@example.com', password: 'wrong' }).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(401);
    expect(error.message).toBe('Incorrect email or password');
  });

  it('rejects an unknown email with the same message', async () => {
    const error = await authenticate({ email: 'nobody@example.com', password: 'x' }).catch((e) => e);
    expect(error.message).toBe('Incorrect email or password');
  });

  it('refuses a duplicate registration', async () => {
    await register(alice);
    await expect(register(alice)).rejects.toThrow('already exists');
  });
});

describe('role guard', () => {
  it('lets the matching role through and blocks others', async () => {
    const user = await register(alice);
    expect(assertRole(user, ['customer'])).toBe(user);
    const error = (() => {
      try {
        assertRole(user, ['admin']);
      } catch (e) {
        return e as AppError;
      }
    })();
    expect(error?.code).toBe('FORBIDDEN');
    expect(error?.status).toBe(403);
  });
});

describe('session token', () => {
  it('round-trips and rejects tampering', async () => {
    const token = await encrypt({ userId: 'u1', role: 'staff' });
    expect(await decrypt(token)).toEqual({ userId: 'u1', role: 'staff' });
    expect(await decrypt(token.slice(0, -2) + 'xx')).toBeNull();
    expect(await decrypt(undefined)).toBeNull();
  });
});
