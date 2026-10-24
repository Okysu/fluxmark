# FluxMark benchmark results

Generated at 2026-10-24T02:38:55.631Z with Node.js v24.19.0 on linux 7.0.0-38-generic, Intel(R) Core(TM) i7-14700KF. Samples: 11; exposed GC: yes.

## What is measured

Public Markdown sources are normalized into a common semantic subset of headings, paragraphs, blockquotes, simple lists, fenced code, links, inline emphasis and image references. The same normalized block tree is serialized as Markdown and FluxMark. The benchmark measures parsing and full semantic HTML string rendering with Markdown-it, marked and FluxMark.

Image references are normalized to links for both formats because FluxMark has no image node; raw HTML and tables that cannot be represented equivalently are omitted from both sides. This is a compiler throughput benchmark, not a browser paint benchmark. Results depend on hardware, Node.js and package versions.

The **rich** corpus contains six public README/media pages chosen for heavy link and image-reference usage. The **all** corpus adds six prose-heavy documentation chapters.

## Source size

| Source | Group | Words | Images | Normalized Markdown chars | FluxMark chars | FluxMark delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| vue-core-readme | rich | 198 | 3 | 2,049 | 1,993 | -2.73% |
| vite-readme | rich | 135 | 0 | 1,258 | 1,232 | -2.07% |
| svelte-readme | rich | 176 | 2 | 1,426 | 1,405 | -1.47% |
| nuxt-readme | rich | 418 | 0 | 3,360 | 3,310 | -1.49% |
| astro-readme | rich | 159 | 5 | 1,860 | 1,801 | -3.17% |
| storybook-readme | rich | 518 | 2 | 4,781 | 4,692 | -1.86% |
| vue-introduction | prose | 1,133 | 0 | 8,362 | 8,313 | -0.59% |
| vue-faq | prose | 1,369 | 0 | 9,475 | 9,423 | -0.55% |
| vue-community | prose | 858 | 0 | 6,000 | 5,936 | -1.07% |
| vite-troubleshooting | prose | 2,140 | 0 | 15,792 | 15,621 | -1.08% |
| node-contributing | prose | 3,943 | 0 | 25,456 | 25,324 | -0.52% |
| rust-installation | prose | 916 | 0 | 6,033 | 5,971 | -1.03% |
| **Total** | | **11,963** | | **85,874** | **85,043** | **-0.97%** |

### Link/media-rich subset

6 documents, 1,604 words, 12 image references. FluxMark used **2.04% fewer source characters** and **2.34% fewer non-whitespace characters**.

## Throughput

### Link/media-rich subset

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 0.40 | 0.44 | 31.89 | 1.00× |
| markdown-it | 0.90 | 0.86 | 16.61 | 1.96× |
| marked | 0.57 | 0.63 | 22.65 | 1.44× |

FluxMark render speedup versus Markdown-it: **1.96×**
FluxMark render speedup versus marked: **1.44×**

### All sources

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 2.00 | 2.36 | 34.66 | 1.00× |
| markdown-it | 2.99 | 3.06 | 26.98 | 1.30× |
| marked | 2.70 | 2.86 | 28.88 | 1.21× |

FluxMark render speedup versus Markdown-it: **1.30×**
FluxMark render speedup versus marked: **1.21×**

## Sources

| ID | Pinned source | License |
| --- | --- | --- |
| vue-core-readme | [vuejs/core/README.md](https://raw.githubusercontent.com/vuejs/core/0ff253bfba3ee8d3d65448bd44ad890fd01b0ecd/README.md) | MIT |
| vite-readme | [vitejs/vite/README.md](https://raw.githubusercontent.com/vitejs/vite/82e7aa0374a15e1c67594557ab5893c91578f897/README.md) | MIT |
| svelte-readme | [sveltejs/svelte/README.md](https://raw.githubusercontent.com/sveltejs/svelte/356c8766a024d5982c276e898903fadaceaca960/README.md) | MIT |
| nuxt-readme | [nuxt/nuxt/README.md](https://raw.githubusercontent.com/nuxt/nuxt/2a81d4a628b8b4c8c844e8dcbfdcf7ae7a7a612e/README.md) | MIT |
| astro-readme | [withastro/astro/README.md](https://raw.githubusercontent.com/withastro/astro/5fe699c888d0423db75cac3f0939409d7eb28e37/README.md) | MIT |
| storybook-readme | [storybookjs/storybook/README.md](https://raw.githubusercontent.com/storybookjs/storybook/9b4e295a7f994b6496cb1fdd50b436dd64925cca/README.md) | MIT |
| vue-introduction | [vuejs/docs/src/guide/introduction.md](https://raw.githubusercontent.com/vuejs/docs/40aa88af0094f7bab4aaf786e55c748a6a251d88/src/guide/introduction.md) | MIT |
| vue-faq | [vuejs/docs/src/about/faq.md](https://raw.githubusercontent.com/vuejs/docs/40aa88af0094f7bab4aaf786e55c748a6a251d88/src/about/faq.md) | MIT |
| vue-community | [vuejs/docs/src/about/community-guide.md](https://raw.githubusercontent.com/vuejs/docs/40aa88af0094f7bab4aaf786e55c748a6a251d88/src/about/community-guide.md) | MIT |
| vite-troubleshooting | [vitejs/vite/docs/guide/troubleshooting.md](https://raw.githubusercontent.com/vitejs/vite/82e7aa0374a15e1c67594557ab5893c91578f897/docs/guide/troubleshooting.md) | MIT |
| node-contributing | [nodejs/node/doc/contributing/pull-requests.md](https://raw.githubusercontent.com/nodejs/node/b12bad4b1119608ba98dcfdcddb4fabaa3c93daf/doc/contributing/pull-requests.md) | MIT |
| rust-installation | [rust-lang/book/src/ch01-01-installation.md](https://raw.githubusercontent.com/rust-lang/book/1500248d8f230566e4ec9f27fcbb8fe9e2898ab1/src/ch01-01-installation.md) | MIT OR Apache-2.0 |

## Reproduce

```bash
pnpm bench
```

The benchmark downloads pinned source revisions into `benchmarks/.cache` and reuses the cache on later runs. Use `node --expose-gc benchmarks/run.mjs` directly after building the SDK to optimize GC behavior.
