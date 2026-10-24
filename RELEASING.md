# Releasing FluxMark

Releases are tag-driven. Pushing a `v*.*.*` tag runs `.github/workflows/release.yml`, verifies that the tag matches `packages/fluxmark/package.json`, then publishes the package with npm provenance.

## One-time repository setup

1. In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. The `deploy-docs.yml` workflow uses the built-in `GITHUB_TOKEN`; no Pages secret is required.
2. In **Settings → Secrets and variables → Actions**, create a secret named `NPM_TOKEN`.
   - Use an npm automation or granular access token with permission to publish the `fluxmark` package.
   - Granular tokens must allow the `fluxmark` package and require two-factor authentication bypass for CI.
3. Ensure the workflow runs from the `main` branch. The local repository uses `main`; documentation deployment also tolerates `master` for older clones.
4. Optional: configure npm trusted publishing for `Okysu/fluxmark` and the `release.yml` workflow on npmjs.com. This is an alternative to `NPM_TOKEN` and requires the npm CLI trusted-publishing path; do not remove the token until that configuration has been verified.

## Environment variables and secrets

| Name | Required | Purpose |
| --- | --- | --- |
| `NPM_TOKEN` | Yes for token-based publishing | Repository secret used by `pnpm publish --provenance`. |
| `GITHUB_TOKEN` | Automatic | Used by GitHub Pages deployment; do not create it manually. |
| `NPM_CONFIG_PROVENANCE` | No | The workflow passes `--provenance` explicitly. |

No repository variables or custom Pages secrets are needed.

## Release checklist

```bash
# 1. Verify the tree
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build

# 2. Bump the SDK version (do not bump the private root package)
pnpm --filter fluxmark exec npm version 0.1.1 --no-git-tag-version

# 3. Commit the version change
git add packages/fluxmark/package.json
git commit -m "chore: release fluxmark 0.1.1"
git push origin main

# 4. Create and push the matching tag
git tag v0.1.1
git push origin v0.1.1
```

The tag workflow rejects a release when the tag is not exactly `v` plus the package version. It also runs type checking and tests before publishing. A failed npm publish can be retried from **Actions → Publish to npm → Run workflow** after fixing the issue.

## Manual dry run

```bash
pnpm --filter fluxmark pack --dry-run
pnpm --filter fluxmark exec npm publish --dry-run --access public
```

The dry run validates the published file list without uploading a package.
