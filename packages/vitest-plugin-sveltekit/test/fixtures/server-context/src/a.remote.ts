import { command } from '$app/server';

import { db } from './data.ts';
import { refreshB } from './helper.ts';

export const run = command(async () => {
  db.touch();
  await refreshB();
});
