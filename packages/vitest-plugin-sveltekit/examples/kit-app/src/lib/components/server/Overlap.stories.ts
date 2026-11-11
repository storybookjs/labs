import { mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
import { requestEvent } from 'vitest-plugin-sveltekit/server.mock';
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
  parameters: { demo: true },
  title: 'Server/Overlap',
  component: PostCount,
  beforeEach: async () => {
    resetGates();
    await resetDb([{ title: 'seed' }]);
  },
});

export const LiveThenCommand = meta.story({
  play: async ({ step }) => {
    requestEvent.cookies.set('session', 'svelty');
    const live = ticker();
    let pending!: ReturnType<typeof probeCommand>;

    await step('A live query starts and sends its first value', async () => {
      await waitFor(() => expect(live.current?.n).toBe(0));
    });
    await step('A command starts and waits at its gate', async () => {
      pending = probeCommand('A');
      await tick();
    });
    await step('The live query sends its next value while the command waits', async () => {
      open('tick');
      await waitFor(() => expect(live.current?.n).toBe(1));
      await tick();
    });
    await step('The command finishes: it still sees its own request', async () => {
      open('A');
      await expect(await pending).toEqual({
        name: 'A',
        sameRequest: true,
        user: { name: 'svelty' },
        url: '/',
        cookieSet: true,
      });
    });
  },
});

export const TwoRealCommands = meta.story({
  play: async ({ step }) => {
    let a!: Promise<unknown>;
    let b!: Promise<unknown>;

    await step('Two commands start, A then B, and wait at their gates', async () => {
      await getTitles();
      a = addTitle('A').updates(getTitles());
      b = addTitle('B').updates(getTitles());
      await tick();
    });
    await step('B finishes first, then A', async () => {
      open('B');
      await tick();
      open('A');
      await Promise.all([a, b]);
    });
    await step('Both titles are in the database', async () => {
      await expect([...(await getTitles())].sort()).toEqual(['A', 'B', 'seed']);
    });
  },
});

export const CookieSurvivesSlowRequest = meta.story({
  beforeEach: () => {
    mockRemote(slowTitles).mockImplementation(async () => {
      await gate('slow');
      return [];
    });
  },
  play: async ({ step }) => {
    let slow!: Promise<unknown>;

    await step('A slow query starts and waits at its gate', async () => {
      slow = slowTitles();
      void slow.then(
        () => {},
        () => {}
      );
      await tick();
    });
    await step('Sign in while the slow query waits: it sets the session cookie', async () => {
      const signedIn = signIn('svelty');
      await tick();
      open('signIn');
      await signedIn;
    });
    await step('The slow query finishes: the cookie stays', async () => {
      open('slow');
      await slow;
      await expect(requestEvent.cookies.get('session')).toBe('svelty');
    });
  },
});
