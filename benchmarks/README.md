# FluxMark benchmarks

This directory contains a reproducible comparison between FluxMark, Markdown-it, marked and snarkdown on public documentation written in Markdown.

The goal is not to claim that FluxMark is a drop-in Markdown replacement. It measures two related questions on an equivalent semantic corpus:

1. How many source characters are needed to express the same normalized article?
2. How quickly can each engine parse that source and produce a semantic HTML string?

## Corpus

The benchmark uses 24 pinned public Markdown documents, about 140k words and 1.04 MB of normalized source.

The **rich** corpus contains nine public README pages selected for dense links, badges and image references:

- `vuejs/core`
- `vitejs/vite`
- `sveltejs/svelte`
- `nuxt/nuxt`
- `withastro/astro`
- `storybookjs/storybook`
- `denoland/deno`
- `facebook/react`
- `microsoft/TypeScript`

The **spec** corpus contains authoritative Markdown technical documents: a Rust RFC, a React RFC and a Kubernetes Enhancement Proposal.

The **prose** corpus contains six regular documentation chapters: Vue guide introduction, FAQ and community guide; Vite's troubleshooting guide; Node.js's pull-request contributing guide; and the Rust Book installation chapter.

The **reference** corpus contains six large Node.js API pages covering `fs`, `errors`, `stream`, `http`, `path` and `buffer`.

The **all** corpus combines all 24 sources.

Every source is pinned to a commit in [`sources.mjs`](./sources.mjs), downloaded into `benchmarks/.cache`, and reused after the first run. The raw documents remain under their upstream licenses.

## Method

Markdown-it's token stream is converted into a common block model for headings, paragraphs, blockquotes, simple lists, fenced code, tables and inline runs. The same model is serialized independently as Markdown and FluxMark.

- Links use `[text](<url>)` in Markdown and `[text|url]` in FluxMark.
- Bold, italic and strike-through use each language's native shorthand.
- Fenced code becomes an indented `$ language` block in FluxMark.
- Markdown tables become FluxMark compact header tables, with column names declared once and positional value rows.
- Ordered and unordered lists use physical indentation in FluxMark.
- Image references use Markdown `![alt](src)` and FluxMark `![src|alt]`, preserving native image semantics.
- Raw HTML is omitted from both sides because FluxMark deliberately has no raw HTML node and equivalent rendering is impossible.

Each engine is warmed up before measurement. Timings are the median of 11 samples after calibration, with GC exposed. The benchmark measures parse and full parse-plus-HTML-render time. It does not include browser layout, paint, hydration or network time. Snarkdown is measured on the table-free prose subset because it does not implement GFM tables.

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

On the recorded 24-document corpus:

| Corpus | Documents | Source characters | Full HTML render vs Markdown-it | vs marked |
| --- | ---: | ---: | ---: | ---: |
| Link- and media-rich READMEs | 9 | 2.77% fewer | 2.23× | 1.53× |
| Authoritative technical specifications | 3 | 0.34% fewer | 1.35× | 1.46× |
| Prose-heavy documentation | 6 | 0.75% fewer | 1.43× | 1.38× |
| Large API and reference documents | 6 | 0.04% fewer | 1.40× | 1.37× |
| All sources | 24 | 0.23% fewer | 1.44× | 1.31× |

On the table-free prose subset, FluxMark is also about 1.23× faster than snarkdown, a minimal Markdown renderer that does not implement GFM tables.

Source-length gains hold across all four corpora. Compact header tables declare column names once; sparse key-value tables remain available for irregular records. The rich subset and prose subset are small enough that startup overhead still matters. Snarkdown does not implement tables, so it is compared only on the table-free prose subset.

Treat these as engineering signals, not universal claims. Re-run on your own hardware before quoting them externally.
