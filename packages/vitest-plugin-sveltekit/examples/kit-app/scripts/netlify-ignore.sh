#!/bin/sh
# Netlify's `ignore` command (`netlify.toml`): exit 0 skips the build, exit 1 builds. Builds only
# when the package, the Kit patch or the lockfile changed. When it can't tell, it builds.

paths="packages/vitest-plugin-sveltekit patches pnpm-lock.yaml pnpm-workspace.yaml"
cd "$(git rev-parse --show-toplevel)" || exit 1

if [ "$CONTEXT" = deploy-preview ]; then
  # A pull request: its changes since it left `main`.
  git fetch --quiet https://github.com/storybookjs/labs.git main || exit 1
  base=$(git merge-base FETCH_HEAD "$COMMIT_REF") || exit 1
else
  # `main`: the changes since the last build. Without a build cache, both refs are the same.
  base=$CACHED_COMMIT_REF
  [ -n "$base" ] && [ "$base" != "$COMMIT_REF" ] || exit 1
fi

# shellcheck disable=SC2086 # `paths` is a list.
git diff --quiet "$base" "$COMMIT_REF" -- $paths
