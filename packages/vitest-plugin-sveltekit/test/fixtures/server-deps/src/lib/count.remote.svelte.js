import { query } from '$app/server';
import { count } from 'pkg-d/count';

export const getCount = query(() => count);
