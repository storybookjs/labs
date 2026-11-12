<script module lang="ts">
  import { expect } from 'storybook/test';

  import { resetDb } from '#lib/server/mocked-db.ts';

  import preview from '../../../../.storybook/preview';
  import PostDetail from '../PostDetail.svelte';

  const { Story } = preview.meta({
    parameters: { demo: true },
    title: 'Server/PostDetail',
    component: PostDetail,
    args: { id: 1 },
    beforeEach: async () => {
      await resetDb([{ title: 'Prerendered from the database', body: 'Real `getPost`.' }]);
    },
  });
</script>

<Story
  name="Real prerender"
  play={async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Prerendered from the database' })
    ).toBeVisible();
  }}
/>

<Story
  name="Not found"
  args={{ id: 42 }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Post 42 not found');
  }}
/>
