# Releasing FluxMark

Releases are tag-driven. Pushing a `v*.*.*` tag runs `.github/workflows/release.yml`, verifies that the tag matches `packages/fluxmark/package.json`, then publishes the package with npm provenance.

Publishing is token-free: the workflow authenticates with npm trusted publishing (OIDC) and npm generates provenance automatically. The workflow ends with a guard that fails the release if the tag version never reaches the registry, because `pnpm publish` exits 0 when the version already exists.

## One-time repository setup

1. In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. The `deploy-docs.yml` workflow uses the built-in `GITHUB_TOKEN`; no Pages secret is required.
2. On npmjs.com, open **Packages → fluxmark → Settings → Trusted publishing** and add a GitHub Actions publisher:
   - Organization or user: `Okysu`
   - Repository: `fluxmark`
   - Workflow filename: `release.yml`
   - Environment: `npm`
   - Allowed actions: `npm publish`
3. Ensure the workflow runs from the `main` branch. The local repository uses `main`; documentation deployment also tolerates `master` for older clones.
4. Recommended once the first trusted publish succeeds: in **Settings → Publishing access**, select **Require two-factor authentication and disallow tokens**, then remove any leftover `NPM_TOKEN` secret.

npm restricts 2FA-bypass tokens for direct publishing from January 2027, so tokens are not a viable CI mechanism; do not reintroduce `NODE_AUTH_TOKEN`.

## Environment variables and secrets

| Name | Required | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | Automatic | Used by GitHub Pages deployment; do not create it manually. |
| `id-token: write` | Automatic | Workflow permission that lets the publish step exchange a GitHub OIDC token for npm credentials. |
| `NPM_CONFIG_PROVENANCE` | No | The workflow passes `--provenance` explicitly. |

No repository secrets or variables are needed. The `npm` deployment environment is optional but must match the environment name configured in the npm trusted publisher.

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
