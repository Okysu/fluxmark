# FluxMark benchmarks

This directory contains a reproducible comparison between FluxMark, Markdown-it and marked on public documentation written in Markdown.

The goal is not to claim that FluxMark is a drop-in Markdown replacement. It measures two related questions on an equivalent semantic corpus:

1. How many source characters are needed to express the same normalized article?
2. How quickly can each engine parse that source and produce a semantic HTML string?

## Corpus

The **rich** corpus is six public README pages selected for dense links, badges and image references:

- `vuejs/core`
- `vitejs/vite`
- `sveltejs/svelte`
- `nuxt/nuxt`
- `withastro/astro`
- `storybookjs/storybook`

The **all** corpus adds six prose-heavy public documentation chapters:

- Vue guide introduction, FAQ and community guide
- Vite troubleshooting guide
- Node.js pull-request contributing guide
- Rust Book installation chapter

Every source is pinned to a commit in [`sources.mjs`](./sources.mjs), downloaded into `benchmarks/.cache`, and reused after the first run. The raw documents remain under their upstream licenses.

## Method

Markdown-it's token stream is converted into a common block model for headings, paragraphs, blockquotes, simple lists, fenced code and inline runs. The same model is serialized independently as Markdown and FluxMark.

- Links use `[text](<url>)` in Markdown and `[text|url]` in FluxMark.
- Bold, italic and strike-through use each language's native shorthand.
- Fenced code becomes an indented `$ language` block in FluxMark.
- Ordered and unordered lists use physical indentation in FluxMark.
- Image references are normalized to links in both formats because FluxMark has no image node.
- HTML-only blocks and tables that cannot be represented equivalently are omitted from both sides.

Each engine is warmed up before measurement. Timings are the median of 11 samples after calibration, with GC exposed. The benchmark measures parse and full parse-plus-HTML-render time. It does not include browser layout, paint, hydration or network time.

Run it with:

```bash
pnpm bench
```

Regenerate the checked-in report with:

```bash
pnpm bench:update
```

## Latest results

See [`RESULTS.md`](./RESULTS.md) for the complete environment, source-size table, all corpus results and pinned source links.

On the recorded 12-document corpus:

- Link/media-rich subset: **2.04% fewer source characters**, **1.96× faster full HTML rendering than Markdown-it**, and **1.44× faster than marked**.
- All sources: **0.97% fewer source characters**, **1.30× faster than Markdown-it**, and **1.21× faster than marked**.

The rich subset is smaller, so fixed startup and measurement overheads have more influence there. Treat these as relative engineering signals, not universal claims. Re-run on your own hardware before quoting them externally.
