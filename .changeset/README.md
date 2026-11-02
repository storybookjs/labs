# Changesets

This folder holds the pending release notes, one file per change, consumed by
[Changesets](https://github.com/changesets/changesets). Run `pnpm changeset` from the repo root to
add one when a PR changes a published package; see [CONTRIBUTING.md](../CONTRIBUTING.md#making-changes).

Labs packages stay on `0.x`, so a changeset must use `minor` (features and breaking changes) or
`patch` (fixes), never `major`.
