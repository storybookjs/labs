import { query } from '$app/server';
import { private_value } from '$app/env/private';
import { helper } from './helper';
import { db } from '#lib/server/db.js';
import { settings } from '#config';
import 'pkg-a';

export const getPosts = query(() => [db, helper, settings, private_value]);
