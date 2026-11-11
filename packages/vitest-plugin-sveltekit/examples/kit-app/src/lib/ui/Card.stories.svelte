<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import type { ComponentProps } from 'svelte';
  import { expect } from 'storybook/test';

  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  import Tag from './Tag.svelte';

  const { Story } = defineMeta({
    title: 'UI/Card',
    component: Card,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" template={plain} />

<Story name="Header and footer" args={{ as: 'section' }} template={withHeaderAndFooter} />

<Story
  name="Interactive"
  args={{ as: 'article', interactive: true }}
  template={postCard}
  play={async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: 'Notes on testing remote functions' })).toHaveFocus();
  }}
/>

<Story name="Long content" args={{ as: 'article' }} template={longContent} />

<Story
  name="Dark"
  args={{ as: 'article', interactive: true }}
  template={postCard}
  globals={{ theme: 'dark' }}
/>

{#snippet plain(args: Partial<ComponentProps<typeof Card>>)}
  <Card {...args}>
    <p style="margin: 0">A plain card holds any content on a raised surface.</p>
  </Card>
{/snippet}

{#snippet withHeaderAndFooter(args: Partial<ComponentProps<typeof Card>>)}
  <Card {...args}>
    {#snippet header()}
      <strong>Drafts</strong>
    {/snippet}
    <p style="margin: 0">Three posts are waiting for a last read.</p>
    {#snippet footer()}
      Updated 2 hours ago
    {/snippet}
  </Card>
{/snippet}

{#snippet longContent(args: Partial<ComponentProps<typeof Card>>)}
  <div style="max-width: 22rem">
    <Card {...args}>
      {#snippet header()}
        <strong>
          A title that goes on for quite a while, with averyveryverylongwordthatneedstobreak
        </strong>
      {/snippet}
      <p style="margin: 0">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante
        venenatis dapibus posuere velit aliquet. Donec ullamcorper nulla non metus auctor
        fringilla. Cras mattis consectetur purus sit amet fermentum.
      </p>
      {#snippet footer()}
        <Button size="sm" variant="secondary">Read more</Button>
      {/snippet}
    </Card>
  </div>
{/snippet}

{#snippet postCard(args: Partial<ComponentProps<typeof Card>>)}
  <div style="max-width: 26rem">
    <Card {...args}>
      {#snippet header()}
        <Badge tone="success">Published</Badge>
      {/snippet}
      <h3 style="margin: 0 0 var(--space-2); font-family: var(--font-serif); font-size: var(--text-xl)">
        <a href="/posts/1" style="color: inherit">Notes on testing remote functions</a>
      </h3>
      <p style="margin: 0; color: var(--color-text-muted)">
        What changes when a component calls the server, and how to keep its stories honest.
      </p>
      {#snippet footer()}
        <div style="display: flex; gap: var(--space-2)">
          <Tag>svelte</Tag>
          <Tag>testing</Tag>
        </div>
      {/snippet}
    </Card>
  </div>
{/snippet}
