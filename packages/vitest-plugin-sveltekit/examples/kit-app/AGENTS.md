<!-- BEGIN:storybook-skills -->
<!-- Storybook updates this section on upgrade. Remove both markers to keep your own edits. -->

## Storybook

For every change to how the UI looks (you create, change, or delete a component, story, style, theme, or design token), follow these steps in order. Each step has a Storybook skill. First invoke the skills of all the steps, before you edit any file. Then follow each skill at its step.

1. `component-docs`: look up the components to reuse, with their props and usage examples, before you edit any file. Also when the user asks about a component's props, API, or usage.
2. `write-stories`: every component you create or change gets stories.
3. `test-stories`: run the story tests after every change, the way this skill says, never with a `package.json` test script, and fix what fails. Also when the user asks to run or fix story tests.
4. `ui-review`: publish a review that shows the user what changed, as your last step. Also when the user asks to see components or stories.

<!-- END:storybook-skills -->

## This project

Field Notes, a SvelteKit blog. Its data comes from SvelteKit remote functions in `src/lib/blog/blog.remote.ts`. Components live in `src/lib/ui` (the design system) and `src/lib/blog` (blog blocks); pages live in `src/lib/pages`, and each route in `src/routes` renders one page.

These project rules come first where the Storybook skills give general advice:

- **Story files** are Svelte CSF: `X.stories.svelte` next to `X.svelte`, with `const { Story } = preview.meta({ ... })` in `<script module>` and one `<Story>` element per story. Copy the shape of `src/lib/blog/AppShell.stories.svelte`. A story's description is the HTML comment above its `<Story>`.
- **Data in stories**: mock remote functions with `mockRemote` from `vitest-plugin-sveltekit/remote.mock`, in the story's `beforeEach`. It returns a `fn()` mock, plus `mockPending()` for the loading state: `mockRemote(readPost).mockResolvedValue(post)`, `mockRemote(publishPost).mockImplementation(async (data, issue) => invalid(issue.title('Taken')))`. Take data from `src/lib/blog/fixtures.ts`. The app makes no `fetch` calls of its own, so remote function mocks are the only data mocks it needs.
- **SvelteKit modules** in stories are mocks already: set `page.url` (from `$app/state`) in `beforeEach`, and check navigation with `expect(goto).toHaveBeenCalledWith(...)` (`goto` from `$app/navigation`).
- **Imports in app code** use the `#lib` alias: `import Button from '#lib/ui/Button.svelte'`. The usage examples in the docs show `./Button.svelte`; translate them.
- **Pages** compose `src/lib/blog` and `src/lib/ui` components. The root layout wraps every page in `AppShell`, so a page's stories wrap it in `AppShell` too. A page's stories file is titled `Pages/...` and has `tags: ['!manifest']`, as in `src/lib/pages/EditorPages.stories.svelte`.
- **Story tests**: run `npx storybook tools test run` with no `--stories` filter, every time. A filtered run silently skips stories whose names contain a space.
