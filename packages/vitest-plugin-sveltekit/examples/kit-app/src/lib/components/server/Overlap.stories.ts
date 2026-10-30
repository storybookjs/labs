import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { requestEvent } from '@storybookjs/vitest-plugin-sveltekit/server.mock';
import { expect, waitFor } from 'storybook/test';

import { gate, open, resetGates } from '#lib/probes/gate.ts';
import {
  addTitle,
  getTitles,
  probeCommand,
  signIn,
  slowTitles,
  ticker,
} from '#lib/probes/probes.remote.ts';
import { resetDb } from '#lib/server/mocked-db.ts';

import preview from '../../../../.storybook/preview';
import PostCount from '../PostCount.svelte';

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

// The overlap probes of `overlap.server.test.ts`, in Storybook.
const meta = preview.meta({
  title: 'Server/Overlap',
  component: PostCount,
  beforeEach: async () => {
    resetGates();
    await resetDb([{ title: 'seed' }]);
  },
});

export const LiveThenCommand = meta.story({
  play: async () => {
    requestEvent.cookies.set('session', 'ada');
    const live = ticker();
    await waitFor(() => expect(live.current?.n).toBe(0));
    const pending = probeCommand('A');
    await tick();
    open('tick');
    await waitFor(() => expect(live.current?.n).toBe(1));
    await tick();
    open('A');
    await expect(await pending).toEqual({
      name: 'A',
      sameRequest: true,
      user: { name: 'ada' },
      url: '/',
      cookieSet: true,
    });
  },
});

export const TwoRealCommands = meta.story({
  play: async () => {
    await getTitles();
    const a = addTitle('A').updates(getTitles());
    const b = addTitle('B').updates(getTitles());
    await tick();
    open('B');
    await tick();
    open('A');
    await Promise.all([a, b]);
    await expect([...(await getTitles())].sort()).toEqual(['A', 'B', 'seed']);
  },
});

export const CookieSurvivesSlowRequest = meta.story({
  beforeEach: () => {
    remote(slowTitles).mockImplementation(async () => {
      await gate('slow');
      return [];
    });
  },
  play: async () => {
    const slow = slowTitles();
    void slow.then(
      () => {},
      () => {}
    );
    await tick();
    const signedIn = signIn('ada');
    await tick();
    open('signIn');
    await signedIn;
    open('slow');
    await slow;
    await expect(requestEvent.cookies.get('session')).toBe('ada');
  },
});
