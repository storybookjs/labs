import { error } from '@sveltejs/kit';
import { drizzle } from 'pkg-b/sub';

export const db = drizzle(error);
