import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['customer', 'staff', 'manager', 'admin']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'inactive', 'suspended']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('customer'),
  // FK to departments is added in Phase 2 when that table exists.
  departmentId: uuid('department_id'),
  accountStatus: accountStatusEnum('account_status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
