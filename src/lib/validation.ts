import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address');

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email,
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^\+?[0-9 -]*$/, 'Enter a valid phone number')
    .optional()
    .transform((v) => v || undefined),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
