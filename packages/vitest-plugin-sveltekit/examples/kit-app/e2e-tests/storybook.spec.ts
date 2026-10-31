import { expect, type Frame, type Page, test } from '@playwright/test';

// Runs against `storybook dev` and against the static `storybook build` (see the config). Each
// story's play function asserts on its own; these checks confirm the end state in the page.

/** The preview: the page itself for `iframe.html`, or the frame in the manager. */
type Preview = Pick<Frame, 'evaluate' | 'getByRole' | 'getByTestId' | 'getByText' | 'locator'>;

const stories: Array<[id: string, check: (preview: Preview) => Promise<void>]> = [
  [
    'postlist--data',
    async (page) => {
      await expect(page.getByRole('link', { name: 'First post' })).toBeVisible();
      await expect(page.getByTestId('stats-1')).toHaveText('100 views, 1 likes');
    },
  ],
  ['postlist--pending', (page) => expect(page.getByText('Loading posts…')).toBeVisible()],
  [
    'postlist--http-error',
    (page) => expect(page.getByRole('alert')).toContainText('The database is asleep'),
  ],
  [
    'postlist--rejected-value',
    (page) => expect(page.getByRole('alert')).toContainText('No posts here'),
  ],
  [
    'postlist--batch',
    (page) => expect(page.getByTestId('stats-2')).toHaveText('200 views, 2 likes'),
  ],
  [
    'postlist--delete-with-command',
    async (page) => {
      await expect(page.getByRole('link', { name: 'Second post' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'First post' })).toHaveCount(0);
    },
  ],
  [
    'postlist--two-commands-in-flight',
    async (page) => {
      await expect(page.getByRole('link', { name: 'Third post' })).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
    },
  ],
  [
    'postlist--query-redirect',
    (page) =>
      expect
        .poll(() => page.evaluate(() => (window as { navigations?: unknown[] }).navigations))
        .toContainEqual(['/elsewhere', undefined]),
  ],
  [
    'postform--validation-issue',
    (page) => expect(page.getByRole('alert')).toHaveText('Title must be at least 3 characters'),
  ],
  [
    'postform--created',
    (page) => expect(page.getByRole('status')).toHaveText('Created “A real title”'),
  ],
  [
    'postform--submitting',
    (page) => expect(page.getByRole('button', { name: 'Create' })).toBeDisabled(),
  ],
  [
    'posts--refresh-after-submit',
    (page) => expect(page.getByRole('link', { name: 'Second post' })).toBeVisible(),
  ],
  [
    'posts--redirect',
    // `goto` from Storybook's `$app/navigation` mock dispatches `storybook:goto`.
    (page) =>
      expect
        .poll(() => page.evaluate(() => (window as { navigations?: unknown[] }).navigations))
        .toEqual([['/posts/42', expect.anything()]]),
  ],
  [
    'postdetail--prerendered',
    (page) => expect(page.getByRole('heading', { name: 'Post 7' })).toBeVisible(),
  ],
  [
    'postdetail--not-found',
    (page) => expect(page.getByRole('alert')).toHaveText('Post 7 not found'),
  ],
  [
    'postcount--live-generator',
    async (page) => {
      await expect(page.locator('output')).toHaveText('2');
      await expect(page.getByTestId('live-status')).toHaveText('done');
    },
  ],
  ['postcount--live-array', (page) => expect(page.locator('output')).toHaveText('4')],
  ['postcount--live-stream', (page) => expect(page.getByRole('alert')).toContainText('Feed down')],
  [
    'postcount--live-stream-open',
    async (page) => {
      await expect(page.locator('output')).toHaveText('7');
      await expect(page.getByTestId('live-status')).toHaveText('live');
    },
  ],
];

/** Records the phases and play errors that the preview reports on its channel. */
async function watchStories(page: Page) {
  await page.addInitScript(() => {
    const navigations: unknown[] = [];
    const phases: string[] = [];
    const playErrors: string[] = [];
    Object.assign(window, { navigations, phases, playErrors });

    window.addEventListener('storybook:goto', (event) => {
      navigations.push((event as CustomEvent<unknown[]>).detail);
    });

    // The preview reports each phase of the story (`playing`, `errored`, `finished`, ...) on its
    // channel. Listen as soon as the preview exists, before the story starts.
    type Channel = { on(event: string, listener: (payload: any) => void): void };
    const listen = () => {
      const channel = (window as { __STORYBOOK_PREVIEW__?: { channel?: Channel } })
        .__STORYBOOK_PREVIEW__?.channel;
      if (!channel) return void setTimeout(listen, 5);
      channel.on('storyRenderPhaseChanged', ({ newPhase }) => phases.push(newPhase));
      channel.on('playFunctionThrewException', (error) => playErrors.push(error.message));
    };
    listen();
  });
}

/** Waits until the story finished, and checks that its play function passed. */
async function expectPlayed(preview: Preview) {
  const state = () =>
    preview.evaluate(() => {
      const { phases, playErrors } = window as unknown as {
        phases: string[];
        playErrors: string[];
      };
      return { phases: [...phases], playErrors: [...playErrors] };
    });
  await expect.poll(async () => (await state()).phases.at(-1)).toBe('finished');
  const { phases, playErrors } = await state();
  expect(playErrors).toEqual([]);
  expect(phases).toContain('played');
  expect(phases).not.toContain('errored');
}

/** The story the preview shows and its phase, from the preview's own state. */
function currentRender(preview: Preview) {
  return preview.evaluate(() => {
    const { currentRender } =
      (window as { __STORYBOOK_PREVIEW__?: { currentRender?: { id: string; phase: string } } })
        .__STORYBOOK_PREVIEW__ ?? {};
    return currentRender && { id: currentRender.id, phase: currentRender.phase };
  });
}

test('serves the manager with the story index', async ({ page, request }) => {
  const index = await (await request.get('/index.json')).json();
  expect(Object.keys(index.entries)).toEqual(expect.arrayContaining(stories.map(([id]) => id)));

  await page.goto('/?path=/story/postlist--data');
  const preview = page.frameLocator('#storybook-preview-iframe');
  await expect(preview.getByRole('link', { name: 'First post' })).toBeVisible();
});

for (const [id, check] of stories) {
  test(`renders ${id} and runs its play function`, async ({ page }) => {
    await watchStories(page);
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await expectPlayed(page);
    await check(page);
  });
}

// Storybook keeps one preview page while you click through the stories. A story that leaves a
// request or a stream open must not leak into the next one.
const transitions: Array<[from: string, to: string, check: (frame: Preview) => Promise<void>]> = [
  [
    'postform--submitting',
    'postform--created',
    // The play function of `Created` clicks Create, which a pending submission would disable.
    (frame) => expect(frame.getByRole('status')).toHaveText('Created “A real title”'),
  ],
  [
    'postcount--live-stream-open',
    'postcount--live-generator',
    async (frame) => {
      await expect(frame.locator('output')).toHaveText('2');
      await expect(frame.getByTestId('live-status')).toHaveText('done');
    },
  ],
];

for (const [from, to, check] of transitions) {
  test(`switching from ${from} to ${to} in one preview starts clean`, async ({ page }) => {
    await page.goto(`/?path=/story/${from}`);
    // Looked up on each call: while the manager loads, it can replace the preview frame. That is
    // also why this test reads the preview's state instead of using `watchStories`.
    const findPreview = () => page.frames().find((frame) => frame.url().includes('/iframe.html'));
    await expect
      .poll(
        async () => {
          const preview = findPreview();
          return preview && (await currentRender(preview).catch(() => undefined));
        },
        { timeout: 60_000 }
      )
      .toEqual({ id: from, phase: 'finished' });
    const preview = findPreview()!;
    await stories.find(([id]) => id === from)?.[1](preview);

    // From here on: what the next story reports, and a mark that this page stays.
    await preview.evaluate(() => {
      type Channel = { on(event: string, listener: (payload: any) => void): void };
      const { channel } = (window as unknown as { __STORYBOOK_PREVIEW__: { channel: Channel } })
        .__STORYBOOK_PREVIEW__;
      const phases: string[] = [];
      const playErrors: string[] = [];
      channel.on('storyRenderPhaseChanged', ({ newPhase }) => phases.push(newPhase));
      channel.on('playFunctionThrewException', (error) => playErrors.push(error.message));
      Object.assign(window, { phases, playErrors, samePreview: true });
    });

    await page.locator(`[data-item-id="${to}"]`).click();
    await expect.poll(() => currentRender(preview)).toEqual({ id: to, phase: 'finished' });
    await expectPlayed(preview);
    await check(preview);
    expect(await preview.evaluate(() => 'samePreview' in window)).toBe(true);
  });
}
