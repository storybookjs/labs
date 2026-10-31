import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { beforeEach, expect, test } from 'vitest';

import { getPosts, getStats } from '#lib/posts.remote.ts';
import { resetDb } from '#lib/server/mocked-db.ts';

beforeEach(async () => {
  await resetDb([{ title: 'db', views: 1, likes: 1 }]);
});

const fns = {
  getPosts: {
    call: async () => (await getPosts('newest')).map((post) => post.title),
    refresh: () => getPosts('newest').refresh(),
    mock: () => remote(getPosts).mockResolvedValue([{ id: 9, title: 'mock', body: '' }]),
    once: () => remote(getPosts).mockResolvedValueOnce([{ id: 9, title: 'mock', body: '' }]),
    real: ['db'],
    mocked: ['mock'],
  },
  getStats: {
    call: async () => (await getStats(1)).views,
    refresh: () => getStats(1).refresh(),
    mock: () => remote(getStats).mockResolvedValue({ views: 99, likes: 0 }),
    once: () => remote(getStats).mockResolvedValueOnce({ views: 99, likes: 0 }),
    real: 1,
    mocked: 99,
  },
};
type Name = keyof typeof fns;
const names = Object.keys(fns) as Name[];
const subsets: Name[][] = [[], ['getPosts'], ['getStats'], ['getPosts', 'getStats']];

/** Calls each function in `order`; returns what each one gave, by name. */
async function callAll(order: Name[]): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  for (const name of order) results[name] = await fns[name].call();
  return results;
}

/** What each function gives when the ones in `mocked` are mocked. */
const expected = (mocked: Name[]) =>
  Object.fromEntries(
    names.map((name) => [name, mocked.includes(name) ? fns[name].mocked : fns[name].real])
  );

// Every mocked subset, every call order, mocks set before the first call or after a real call.
for (const mocked of subsets) {
  for (const order of [names, [...names].reverse()]) {
    const label = `mock ${mocked.join('+') || 'none'}`;

    test(`M: ${label} before calls, order ${order.join('>')}`, async () => {
      for (const name of mocked) fns[name].mock();
      expect(await callAll(order)).toEqual(expected(mocked));
    });

    test(`M: ${label} after calls, order ${order.join('>')}`, async () => {
      expect(await callAll(order)).toEqual(expected([]));
      for (const name of mocked) fns[name].mock();
      for (const name of order) await fns[name].refresh();
      expect(await callAll(order)).toEqual(expected(mocked));
    });
  }
}

for (const name of names) {
  for (const other of names.filter((n) => n !== name)) {
    test(`M-once: ${name} once-mock, ${other} real, ${other} first`, async () => {
      fns[name].once();
      expect(await fns[other].call()).toEqual(fns[other].real);
      expect(await fns[name].call()).toEqual(fns[name].mocked);
      await fns[name].refresh();
      expect(await fns[name].call()).toEqual(fns[name].real);
      expect(remote(name === 'getPosts' ? getPosts : getStats)).toHaveBeenCalledTimes(1);
    });
  }
}
