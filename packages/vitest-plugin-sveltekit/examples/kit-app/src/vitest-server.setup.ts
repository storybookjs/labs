import { vi } from 'vitest';

// The remote functions run for real in the `server` project; the database is PGlite in memory.
vi.mock('#lib/server/db.ts');
