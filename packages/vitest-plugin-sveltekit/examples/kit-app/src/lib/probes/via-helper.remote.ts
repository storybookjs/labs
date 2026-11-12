import { command } from '$app/server';

import { titlesViaHelper } from './titles-helper.ts';

/**
 * A command that reaches a remote function of another file through a plain server helper:
 * `via-helper.remote.ts → titles-helper.ts → probes.remote.ts`.
 */
export const countViaHelper = command(async () => (await titlesViaHelper()).length);
