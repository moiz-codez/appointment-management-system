// Runs before each test file: point the app at the TEST database (never the dev DB).
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

if (!process.env.DATABASE_URL_TEST) throw new Error('DATABASE_URL_TEST is not set');
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.SESSION_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';
