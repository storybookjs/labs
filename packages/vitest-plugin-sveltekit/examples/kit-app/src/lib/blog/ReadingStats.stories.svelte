<script module lang="ts">
  import { httpError, mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import { getReadingStats } from './blog.remote.ts';
  import ReadingStats from './ReadingStats.svelte';
  import { seedDatabase } from './story-helpers.ts';

  const { Story } = defineMeta({
    title: 'Posts/ReadingStats',
    component: ReadingStats,
    parameters: { layout: 'padded' },
    args: { id: 2 },
  });
</script>

<Story
  name="Data"
  beforeEach={() => {
    mockRemote(getReadingStats).mockResolvedValue({ views: 12_800, likes: 96 });
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('13K views')).toBeVisible();
    await expect(mockRemote(getReadingStats)).toHaveBeenCalledWith(2);
  }}
/>

<Story
  name="Loading"
  beforeEach={() => {
    mockRemote(getReadingStats).mockPending();
  }}
/>

<Story
  name="Error"
  exportName="Failed"
  beforeEach={() => {
    mockRemote(getReadingStats).mockRejectedValue(httpError(503, 'Stats are resting'));
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('Stats unavailable')).toBeVisible();
  }}
/>

<Story
  name="Server mode"
  beforeEach={seedDatabase}
  play={async ({ canvas }) => {
    // The second seed post: 1280 views, 96 likes.
    await expect(await canvas.findByText('1.3K views')).toBeVisible();
  }}
/>
