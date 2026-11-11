import { query } from '$app/server';

import { readB } from './server/b-db.ts';

export const getB = query(() => readB());
