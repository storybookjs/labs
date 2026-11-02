# Contributing

Thanks for helping out! This repository hosts experiments from the Storybook team. Packages here are
early, published as `@storybook/<name>` and kept on `0.x` until they move into Storybook as an officail feature (or get retired).

## Setup

You need Node `>= 22.19` and pnpm. The pnpm version is pinned in the root `package.json`
(`packageManager`), so with [Corepack](https://nodejs.org/api/corepack.html) enabled the right one
is picked up automatically:

```sh
corepack enable
git clone https://github.com/storybookjs/labs.git
cd labs
pnpm install
```

The repo's tooling is [Vite+](https://viteplus.dev) (`vp`), which wraps pnpm, Vitest, oxlint and
the formatter.

## Everyday commands

Run these from the repo root:

| Command                      | What it does                                           |
| ---------------------------- | ------------------------------------------------------ |
| `pnpm build`                 | Builds every package                                   |
| `pnpm typecheck`             | Typechecks the root scripts and every package          |
| `pnpm test`                  | Runs the unit tests of every package                   |
| `pnpm lint` / `pnpm lint:fix`| Lints the repo (and fixes what it can)                 |
| `pnpm fmt` / `pnpm fmt:check`| Formats the repo (or checks formatting)                |
| `pnpm new`                   | Scaffolds a new package (see below)                    |

To target a single package, use a pnpm filter, e.g. `pnpm vp run --filter @storybook/vite-plugin build`,
or run the package's own scripts from its folder. Packages with examples expose them as
`example:*` scripts in their `package.json`.

## Repository layout

- `packages/*` — the published packages. Each one owns its dependencies and versions; the root
  `catalogs` in `pnpm-workspace.yaml` is only for shared tooling.
- `packages/*/examples/*` — example apps used to try and e2e-test a package. They are workspace
  packages but are never published and are excluded from the root `build`/`typecheck`.
- `templates/*` — starting points for `pnpm new`.
- `scripts/*` — repository tooling (`create-package.ts`, `check-changesets.ts`).
- `.changeset/*` — pending release notes, one file per change (see [Releasing](#releasing)).

## Adding a package

```sh
pnpm new
```

The script asks for a name (lowercase letters, digits and dashes; published as
`@storybook/<name>`), a one-line description and a template, then copies
`templates/<template>` to `packages/<name>`, fills in `package.json` and `README.md`, formats the
result and runs `pnpm install`. Flags (`--name`, `--description`, `--template`, `--skip-install`) skip
the prompts; `pnpm new -- --help` lists them.

New packages start at `0.0.0` and must stay on `0.x` while they live in this repo.

## Making changes

Every change lands through a pull request that is **squash merged**. Because of that:

- **The PR title is the commit message.** It must follow
  [Conventional Commits](https://www.conventionalcommits.org/), with a lowercase subject, e.g.
  `feat(vite-plugin): serve the manager from the host dev server` or `ci: pin action versions`. A
  check on every PR enforces this; individual commits inside the PR can be anything.
- Use `feat` / `fix` / `perf` for user-facing changes and `docs`, `chore`, `ci`, `refactor`,
  `test` otherwise. Scope with the package name when a change is specific to one package. Add `!`
  (or a `BREAKING CHANGE:` footer in the PR description) for breaking changes.
- **Add a changeset** when the PR changes a published package:

  ```sh
  pnpm changeset
  ```

  Pick the affected packages and a bump type, then write the note users will read in the
  changelog and the GitHub release: what changed and why, from their point of view. Labs
  packages stay on `0.x`, so use `minor` for features and breaking changes and `patch` for fixes;
  `major` is rejected by CI. A change that needs no release (docs, internal refactors, examples)
  still needs an empty changeset, `pnpm changeset --empty`, to satisfy the check. The
  [changeset bot](https://github.com/apps/changeset-bot) comments on each PR with its status.

### Checks

CI runs on every PR and on `main`:

- lint and format checks on the whole repo;
- typecheck and build for the packages touched by the PR (plus their dependents), or every package
  when something outside `packages/` changes;
- unit tests for the affected packages (`vp test run --changed`);
- the changeset check above (`node scripts/check-changesets.ts --since origin/main`);
- a [zizmor](https://github.com/zizmorcore/zizmor) audit of the GitHub workflows;
- the PR title check above.

Run `pnpm lint`, `pnpm fmt:check`, `pnpm typecheck` and `pnpm test` locally before pushing
to avoid round trips. All checks must be green before a PR can be merged.

### Previews

Every PR (and every push to `main`) publishes the packages to [pkg.pr.new](https://pkg.pr.new); a
bot comment on the PR lists the install commands, of the form:

```sh
pnpm add https://pkg.pr.new/storybookjs/labs/@storybook/<name>@<sha>
```

Use this to try a change in a real project before it's released.

## Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets):

1. Every PR that touches a published package adds a changeset (see above).
2. When changesets land on `main`, the release workflow opens, or refreshes, a
   **"chore: version packages"** PR on the `changeset-release/main` branch. It bumps the versions,
   writes the pending notes into each package's `CHANGELOG.md` and deletes the consumed
   changesets. It accumulates until a maintainer decides to release.
3. Merging that PR publishes every bumped package to npm through
   [trusted publishing](https://docs.npmjs.com/trusted-publishers) (no npm token), tags each
   one as `<package name>@<version>` (e.g. `@storybook/vite-plugin@0.2.0`) and creates a GitHub
   release per package from its changelog entry.

Packages are released independently; only those with changesets get a new version. A package's
first version can't go through trusted publishing, since npm only allows it on packages that
already exist, so `pnpm new` prints the one-off manual publish to run beforehand.

To publish pre-release versions (`0.3.0-alpha.1`), use
[pre mode](https://github.com/changesets/changesets/blob/main/docs/prereleases.md):
`pnpm changeset pre enter alpha` on `main`, then `pnpm changeset pre exit` once the pre-release
cycle is over.
