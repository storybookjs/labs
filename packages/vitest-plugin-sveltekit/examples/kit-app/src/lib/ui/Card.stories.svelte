<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import { expect } from 'storybook/test';

  import preview from '../../../.storybook/preview';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  import Tag from './Tag.svelte';

  const { Story } = preview.meta({
    title: 'UI/Card',
    tags: ['autodocs'],
    component: Card,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ children: plain }} />

<!-- A group with a title: `as="section"`, with a header and a footer. -->
<Story
  name="Header and footer"
  args={{ as: 'section', header: draftsHeader, children: drafts, footer: draftsFooter }}
/>

<!-- One item of a list that links to its own page: `as="article"` and `interactive`. -->
<Story
  name="Interactive"
  args={{
    as: 'article',
    interactive: true,
    header: postBadge,
    children: postSummary,
    footer: postTags,
  }}
  template={postWidth}
  play={async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: 'Notes on testing remote functions' })).toHaveFocus();
  }}
/>

<Story
  name="Long content"
  tags={['!manifest']}
  args={{ as: 'article', header: longTitle, children: longText, footer: readMore }}
  template={narrow}
/>

<Story
  name="Dark"
  tags={['!manifest']}
  args={{
    as: 'article',
    interactive: true,
    header: postBadge,
    children: postSummary,
    footer: postTags,
  }}
  template={postWidth}
  globals={{ theme: 'dark' }}
/>

{#snippet narrow(args: ComponentProps<typeof Card>)}
  <div style="max-width: 22rem">
    <Card {...args} />
  </div>
{/snippet}

{#snippet postWidth(args: ComponentProps<typeof Card>)}
  <div style="max-width: 26rem">
    <Card {...args} />
  </div>
{/snippet}

{#snippet plain()}
  <p style="margin: 0">A plain card holds any content on a raised surface.</p>
{/snippet}

{#snippet draftsHeader()}
  <strong>Drafts</strong>
{/snippet}

{#snippet drafts()}
  <p style="margin: 0">Three posts are waiting for a last read.</p>
{/snippet}

{#snippet draftsFooter()}
  Updated 2 hours ago
{/snippet}

{#snippet longTitle()}
  <strong>
    A title that goes on for quite a while, with averyveryverylongwordthatneedstobreak
  </strong>
{/snippet}

{#snippet longText()}
  <p style="margin: 0">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis
    dapibus posuere velit aliquet. Donec ullamcorper nulla non metus auctor fringilla. Cras mattis
    consectetur purus sit amet fermentum.
  </p>
{/snippet}

{#snippet readMore()}
  <Button size="sm" variant="secondary">Read more</Button>
{/snippet}

{#snippet postBadge()}
  <Badge tone="success">Published</Badge>
{/snippet}

{#snippet postSummary()}
  <h3 style="margin: 0 0 var(--space-2); font-family: var(--font-serif); font-size: var(--text-xl)">
    <a href="/posts/1" style="color: inherit">Notes on testing remote functions</a>
  </h3>
  <p style="margin: 0; color: var(--color-text-muted)">
    What changes when a component calls the server, and how to keep its stories honest.
  </p>
{/snippet}

{#snippet postTags()}
  <div style="display: flex; gap: var(--space-2)">
    <Tag>svelte</Tag>
    <Tag>testing</Tag>
  </div>
{/snippet}
