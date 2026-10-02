import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['customer', 'staff', 'manager', 'admin']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'inactive', 'suspended']);
export const counterStatusEnum = pgEnum('counter_status', ['available', 'busy', 'break', 'closed']);
export const ruleScopeEnum = pgEnum('rule_scope', ['org', 'department']);

// Karachi local wall-clock times "HH:MM". Weekday keys 0 (Sunday) - 6; a missing day is closed.
export type WorkingHours = Partial<Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', { open: string; close: string }>>;
export type BreakWindow = { start: string; end: string; days: number[] };

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  workingHours: jsonb('working_hours').$type<WorkingHours>().notNull().default({}),
  breakWindows: jsonb('break_windows').$type<BreakWindow[]>().notNull().default([]),
  active: boolean('active').notNull().default(true),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('customer'),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  accountStatus: accountStatusEnum('account_status').notNull().default('active'),
  createdAt: createdAt(),
});

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id),
  name: text('name').notNull(),
  // Token prefix, e.g. "A" -> A-027. Unique so a token number always means one service.
  code: text('code').notNull().unique(),
  averageDurationMin: integer('average_duration_min').notNull(),
  isPriority: boolean('is_priority').notNull().default(false),
  active: boolean('active').notNull().default(true),
});

export const counters = pgTable('counters', {
  id: uuid('id').primaryKey().defaultRandom(),
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id),
  name: text('name').notNull().unique(),
  assignedStaffId: uuid('assigned_staff_id').references(() => users.id, { onDelete: 'set null' }),
  // FK to tokens is added in Phase 4 when that table exists.
  currentTokenId: uuid('current_token_id'),
  status: counterStatusEnum('status').notNull().default('closed'),
});

export const counterServices = pgTable(
  'counter_services',
  {
    counterId: uuid('counter_id')
      .notNull()
      .references(() => counters.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.counterId, t.serviceId] })]
);

export const slotConfigs = pgTable('slot_configs', {
  serviceId: uuid('service_id')
    .primaryKey()
    .references(() => services.id, { onDelete: 'cascade' }),
  slotLengthMin: integer('slot_length_min').notNull(),
  maxPerSlot: integer('max_per_slot').notNull(),
  dailyLimit: integer('daily_limit').notNull(),
});

// §10 organisation rules. Department rows override org rows, which override code defaults.
export const rules = pgTable(
  'rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: ruleScopeEnum('scope').notNull(),
    departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
  },
  (t) => [unique().on(t.scope, t.departmentId, t.key).nullsNotDistinct()]
);

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: uuid('entity_id'),
  details: jsonb('details').notNull().default({}),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type Department = typeof departments.$inferSelect;
export type Service = typeof services.$inferSelect;
