import { query } from '$app/server';
import { private_value } from '$app/env/private';
import { helper } from './helper';
import { db } from '#lib/server/db.js';
import { settings } from '#config';
// Two `*` in the target: `./src/features/flags/flags.js`.
import { flags } from '#feature/flags';
import 'pkg-a';

export const getPosts = query(() => [db, helper, settings, flags, private_value]);
