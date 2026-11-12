<script module lang="ts">
  import { expect } from 'storybook/test';

  import { db } from '#lib/server/db.ts';
  import { resetDb } from '#lib/server/mocked-db.ts';
  import { posts } from '#lib/server/schema.ts';

  import preview from '../../../../.storybook/preview';
  import PostCount from '../PostCount.svelte';

  const { Story } = preview.meta({
    parameters: { demo: true },
    title: 'Server/PostCount',
    component: PostCount,
    beforeEach: async () => {
      await resetDb([{ title: 'One' }, { title: 'Two' }]);
    },
  });
</script>

<Story
  name="Live updates"
  play={async ({ canvas, step }) => {
    await expect(await canvas.findByText('2')).toBeVisible();
    await expect(await canvas.findByText('live')).toBeVisible();

    await step('A third post lands in the database', async () => {
      await db.insert(posts).values({ title: 'Three' });
    });
    // The real `getPostCount` hears the insert (a Postgres NOTIFY) and counts again.
    await expect(await canvas.findByText('3')).toBeVisible();
  }}
/>
