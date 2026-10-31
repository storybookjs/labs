<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';

  import Badge from './Badge.svelte';

  const { Story } = defineMeta({
    title: 'UI/Badge',
    component: Badge,
    parameters: { layout: 'centered' },
    argTypes: {
      tone: {
        control: 'inline-radio',
        options: ['neutral', 'accent', 'success', 'warning', 'danger'],
      },
    },
  });
</script>

<Story name="Neutral">Draft</Story>

<Story name="Accent" args={{ tone: 'accent' }}>New</Story>

<Story name="Success" args={{ tone: 'success' }}>Published</Story>

<Story name="Warning" args={{ tone: 'warning' }}>Scheduled</Story>

<Story name="Danger" args={{ tone: 'danger' }}>Archived</Story>

<Story name="Long content" asChild>
  <div style="max-width: 12rem">
    <Badge tone="accent">A very long badge label that does not fit</Badge>
  </div>
</Story>

<Story name="All tones" asChild>
  {@render tones()}
</Story>

<Story name="Dark" asChild globals={{ theme: 'dark' }}>
  {@render tones()}
</Story>

{#snippet tones()}
  <div style="display: flex; flex-wrap: wrap; gap: var(--space-2)">
    <Badge>Draft</Badge>
    <Badge tone="accent">New</Badge>
    <Badge tone="success">Published</Badge>
    <Badge tone="warning">Scheduled</Badge>
    <Badge tone="danger">Archived</Badge>
  </div>
{/snippet}
