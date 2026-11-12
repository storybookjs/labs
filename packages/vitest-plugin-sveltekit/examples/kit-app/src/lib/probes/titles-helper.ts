// A server helper that calls a remote function, as `$lib/server/*.ts` modules sometimes do.
import { getTitles } from './probes.remote.ts';

export async function titlesViaHelper(): Promise<string[]> {
  return getTitles();
}
