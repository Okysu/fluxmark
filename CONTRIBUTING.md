# Contributing to FluxMark

## Development setup

FluxMark requires Node.js 20.19 or newer and pnpm 11.

```sh
pnpm install
pnpm dev
```

The core SDK is in `packages/fluxmark`. The VitePress documentation, bilingual site and live Playground are in `docs`.

## Verification

Run all checks before opening a pull request:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm build:docs
```

Core changes must include focused Vitest coverage. Parser changes should also
consider worst-case input, source offsets, CRLF input, and rendering safety.
Keep the published `fluxmark` package free of runtime dependencies.

To add an interactive documentation example, use a fenced code block with
language `text` and the `live` meta flag:

````markdown
```text live
# Live FluxMark source
  This block renders HTML, AST and timings below the docs code sample.
```
````

The VitePress fence transform creates a `FluxExample` component automatically.

## Architecture rules

- Block and inline parsing belong in the SDK, never in Vue components.
- AST transforms use `walkAST` and preserve source location metadata.
- HTML text and attributes must be escaped; URLs must pass the protocol policy.
- HTML text and attributes must be escaped; URLs must pass the protocol policy.
- Renderer overrides must preserve the documented helper and `defaultRender` contracts.
- Public API changes require type declarations, documentation, and tests.

## Commits and releases

Use concise commits that describe behavior rather than implementation noise.
CI runs on every pull request. Documentation deploys from `main`; package
publishing is restricted to the release workflow.
