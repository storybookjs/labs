<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect, waitFor } from 'storybook/test';

  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  import EmptyState from './EmptyState.svelte';
  import Footer from './Footer.svelte';
  import Header from './Header.svelte';
  import Layout from './Layout.svelte';
  import Pagination from './Pagination.svelte';
  import Skeleton from './Skeleton.svelte';
  import Tag from './Tag.svelte';
  import { clearToasts, toast } from './toasts.svelte.ts';

  const { Story } = defineMeta({
    title: 'UI/Layout',
    component: Layout,
    parameters: { layout: 'fullscreen' },
    beforeEach: () => {
      clearToasts();
      return clearToasts;
    },
  });

  const posts = [
    {
      id: 1,
      title: 'Notes on testing remote functions',
      excerpt: 'What changes when a component calls the server, and how to keep its stories honest.',
      tags: ['svelte', 'testing'],
      draft: false,
    },
    {
      id: 2,
      title: 'A calm palette for a reading app',
      excerpt: 'Warm paper, ink that is not quite black, and one colour that does the pointing.',
      tags: ['design'],
      draft: true,
    },
    {
      id: 3,
      title: 'Keyboard first',
      excerpt: 'Every action in Field Notes works without a mouse. Here is how we check it.',
      tags: ['a11y', 'testing'],
      draft: false,
    },
  ];
</script>

<Story
  name="Blog index"
  asChild
  play={async ({ canvas, userEvent }) => {
    await userEvent.tab();
    const skip = canvas.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toHaveFocus();
    await expect(skip).toHaveAttribute('href', '#main');
    await expect(canvas.getByRole('main')).toHaveAttribute('id', 'main');
  }}
>
  {@render page()}
</Story>

<Story
  name="Narrow article"
  asChild
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('main')).toHaveClass('narrow');
  }}
>
  <Layout width="narrow">
    {#snippet header()}
      {@render header_()}
    {/snippet}
    <article class="article">
      <p class="meta">Ada Lovelace · 31 October 2026</p>
      <h1>A calm palette for a reading app</h1>
      {#each { length: 4 } as _, index (index)}
        <p>
          Warm paper, ink that is not quite black, and one colour that does the pointing. Paragraph
          {index + 1} sets the measure at about seventy characters, so the eye finds the next line
          without effort.
        </p>
      {/each}
    </article>
    {#snippet footer()}
      <Footer />
    {/snippet}
  </Layout>
</Story>

<Story name="Loading" asChild>
  <Layout>
    {#snippet header()}
      {@render header_()}
    {/snippet}
    <div class="list">
      {#each { length: 3 } as _, index (index)}
        <Card>
          <Skeleton width="60%" height="1.5rem" />
          <div style="margin-top: var(--space-3)"><Skeleton lines={2} /></div>
        </Card>
      {/each}
    </div>
    {#snippet footer()}
      <Footer />
    {/snippet}
  </Layout>
</Story>

<Story name="Empty" asChild>
  <Layout>
    {#snippet header()}
      {@render header_()}
    {/snippet}
    <EmptyState title="No posts yet" description="Posts you write show up here.">
      {#snippet action()}
        <Button href="/posts/new">Write the first post</Button>
      {/snippet}
    </EmptyState>
    {#snippet footer()}
      <Footer />
    {/snippet}
  </Layout>
</Story>

<Story
  name="With toast"
  asChild
  play={async ({ canvas }) => {
    toast('Post published', { tone: 'success', timeout: 0 });
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('Post published'));
  }}
>
  {@render page()}
</Story>

<Story name="Mobile" asChild globals={{ viewport: { value: 'mobile1' } }}>
  {@render page()}
</Story>

<Story name="Dark" asChild globals={{ theme: 'dark' }}>
  {@render page()}
</Story>

{#snippet header_()}
  <Header>
    {#snippet nav()}
      <a href="/posts" aria-current="page">Posts</a>
      <a href="/tags">Tags</a>
      <a href="/drafts">Drafts</a>
    {/snippet}
    {#snippet actions()}
      <Button size="sm" href="/posts/new">Write</Button>
    {/snippet}
  </Header>
{/snippet}

{#snippet page()}
  <Layout>
    {#snippet header()}
      {@render header_()}
    {/snippet}
    <h1 class="title">Posts</h1>
    <div class="list">
      {#each posts as post (post.id)}
        <Card as="article" interactive>
          <div class="post-head">
            <h2><a href="/posts/{post.id}">{post.title}</a></h2>
            {#if post.draft}<Badge tone="warning">Draft</Badge>{/if}
          </div>
          <p class="excerpt">{post.excerpt}</p>
          {#snippet footer()}
            <div class="tags">
              {#each post.tags as tag (tag)}
                <Tag href="/tags/{tag}">{tag}</Tag>
              {/each}
            </div>
          {/snippet}
        </Card>
      {/each}
    </div>
    <div style="margin-top: var(--space-6)">
      <Pagination page={1} pageCount={4} href={(page) => `/posts?page=${page}`} />
    </div>
    {#snippet footer()}
      <Footer />
    {/snippet}
  </Layout>
{/snippet}

<style>
  .title,
  .article h1 {
    margin: 0 0 var(--space-5);
    font-family: var(--font-serif);
    font-size: var(--text-3xl);
    line-height: var(--leading-tight);
  }

  .list {
    display: grid;
    gap: var(--space-4);
  }

  .post-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-3);
  }

  h2 {
    margin: 0;
    font-family: var(--font-serif);
    font-size: var(--text-xl);
    line-height: var(--leading-tight);
  }

  h2 a {
    color: inherit;
    text-decoration: none;
  }

  h2 a:hover {
    text-decoration: underline;
  }

  .excerpt {
    margin: var(--space-2) 0 0;
    color: var(--color-text-muted);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .article {
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    line-height: var(--leading-relaxed);
  }

  .meta {
    margin: 0 0 var(--space-2);
    color: var(--color-text-muted);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
  }
</style>
