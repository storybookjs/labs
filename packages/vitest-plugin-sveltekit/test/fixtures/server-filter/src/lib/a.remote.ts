import { query } from '$app/server';

import { readA } from './server/a-db.ts';

export const getA = query(() => readA());
