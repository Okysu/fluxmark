# FluxMark benchmark results

Generated at 2026-10-24T03:03:12.215Z with Node.js v24.19.0 on linux 7.0.0-38-generic, Intel(R) Core(TM) i7-14700KF. Samples: 11; exposed GC: yes.

## What is measured

Public Markdown sources are normalized into a common semantic subset of headings, paragraphs, blockquotes, simple lists, fenced code, links, inline emphasis and image references. The same normalized block tree is serialized as Markdown and FluxMark. The benchmark measures parsing and full semantic HTML string rendering with Markdown-it, marked and FluxMark.

Image references use native image syntax in both formats. Tables are retained; FluxMark uses a compact header row so column names appear once. Raw HTML is omitted from both sides because FluxMark deliberately has no raw HTML node and an equivalent rendering comparison is impossible. This is a compiler throughput benchmark, not a browser paint benchmark. Results depend on hardware, Node.js and package versions. The lightweight snarkdown parser is measured only on the table-free prose subset because it does not implement GFM tables.

The **rich** corpus contains nine public README/media pages chosen for dense links and image references. The **spec** corpus contains three authoritative Markdown technical specifications (Rust RFC, React RFC, Kubernetes KEP). The **prose** corpus contains six regular documentation chapters. The **reference** corpus adds six large Node.js API reference documents, including table-heavy pages. The **all** corpus combines all twenty-four sources.

## Source size

| Source | Group | Words | Images | Normalized Markdown chars | FluxMark chars | FluxMark delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| vue-core-readme | rich | 198 | 3 | 2,052 | 1,996 | -2.73% |
| vite-readme | rich | 135 | 3 | 1,616 | 1,565 | -3.16% |
| svelte-readme | rich | 176 | 2 | 1,428 | 1,407 | -1.47% |
| nuxt-readme | rich | 418 | 0 | 3,360 | 3,310 | -1.49% |
| astro-readme | rich | 159 | 25 | 4,434 | 4,252 | -4.1% |
| storybook-readme | rich | 518 | 26 | 8,545 | 8,307 | -2.79% |
| deno-readme | rich | 278 | 5 | 3,103 | 2,996 | -3.45% |
| react-readme | rich | 538 | 5 | 4,969 | 4,859 | -2.21% |
| typescript-readme | rich | 199 | 4 | 2,457 | 2,386 | -2.89% |
| vue-introduction | prose | 1,133 | 0 | 8,362 | 8,313 | -0.59% |
| vue-faq | prose | 1,369 | 0 | 9,475 | 9,423 | -0.55% |
| vue-community | prose | 858 | 0 | 6,000 | 5,936 | -1.07% |
| vite-troubleshooting | prose | 2,140 | 0 | 15,792 | 15,621 | -1.08% |
| node-contributing | prose | 3,943 | 0 | 25,456 | 25,324 | -0.52% |
| rust-installation | prose | 916 | 0 | 6,033 | 5,971 | -1.03% |
| rust-rfc-nll | spec | 13,369 | 0 | 83,244 | 83,129 | -0.14% |
| react-rfc-server-components | spec | 7,390 | 0 | 49,225 | 49,089 | -0.28% |
| kubernetes-kep-in-place-resize | spec | 11,608 | 0 | 88,271 | 87,780 | -0.56% |
| node-api-fs | reference | 28,864 | 0 | 217,275 | 216,356 | -0.42% |
| node-api-errors | reference | 12,342 | 0 | 95,268 | 95,167 | -0.11% |
| node-api-stream | reference | 17,847 | 0 | 133,056 | 133,493 | +0.33% |
| node-api-http | reference | 16,491 | 0 | 125,191 | 125,276 | +0.07% |
| node-api-path | reference | 1,773 | 0 | 14,437 | 14,416 | -0.15% |
| node-api-buffer | reference | 17,189 | 0 | 130,266 | 130,508 | +0.19% |
| **Total** | | **139,851** | | **1,039,361** | **1,036,926** | **-0.23%** |

## Results by source type

| Corpus | Documents | Words | Images | Tables | Source chars | Non-whitespace chars | Render vs Markdown-it | Render vs marked |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Link/media-rich public READMEs | 9 | 2,619 | 73 | 5 | -2.77% | -3.09% | 2.23× | 1.53× |
| Authoritative technical specifications | 3 | 32,367 | 0 | 0 | -0.34% | -0.56% | 1.35× | 1.46× |
| Prose-heavy documentation chapters | 6 | 10,359 | 0 | 0 | -0.75% | -0.89% | 1.43× | 1.38× |
| Large API and reference documents | 6 | 94,506 | 0 | 5 | -0.04% | -0.74% | 1.40× | 1.37× |
| All public documentation sources | 24 | 139,851 | 73 | 10 | -0.23% | -0.79% | 1.44× | 1.31× |

## Throughput

### Link/media-rich public READMEs

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 0.65 | 0.87 | 34.32 | 1.00× |
| markdown-it | 2.07 | 1.95 | 15.80 | 2.23× |
| marked | 1.17 | 1.34 | 23.05 | 1.53× |

FluxMark render speedup versus Markdown-it: **2.23×**
FluxMark render speedup versus marked: **1.53×**

### Authoritative technical specifications

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 4.22 | 5.06 | 41.85 | 1.00× |
| markdown-it | 6.38 | 6.83 | 31.11 | 1.35× |
| marked | 6.66 | 7.39 | 28.73 | 1.46× |

FluxMark render speedup versus Markdown-it: **1.35×**
FluxMark render speedup versus marked: **1.46×**

### Prose-heavy documentation chapters

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 1.33 | 1.54 | 43.96 | 1.00× |
| markdown-it | 2.17 | 2.20 | 31.06 | 1.43× |
| marked | 1.94 | 2.14 | 32.00 | 1.38× |
| snarkdown | — | 1.89 | 36.21 | 1.22× |

FluxMark render speedup versus Markdown-it: **1.43×**
FluxMark render speedup versus marked: **1.38×**

### Large API and reference documents

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 17.97 | 22.62 | 30.32 | 1.00× |
| markdown-it | 29.37 | 31.60 | 21.71 | 1.40× |
| marked | 26.89 | 30.89 | 22.21 | 1.37× |

FluxMark render speedup versus Markdown-it: **1.40×**
FluxMark render speedup versus marked: **1.37×**

### All public documentation sources

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 24.35 | 33.11 | 30.06 | 1.00× |
| markdown-it | 41.96 | 47.83 | 20.86 | 1.44× |
| marked | 37.93 | 43.37 | 23.00 | 1.31× |

FluxMark render speedup versus Markdown-it: **1.44×**
FluxMark render speedup versus marked: **1.31×**

## Sources

| ID | Pinned source | License |
| --- | --- | --- |
| vue-core-readme | [vuejs/core/README.md](https://raw.githubusercontent.com/vuejs/core/0ff253bfba3ee8d3d65448bd44ad890fd01b0ecd/README.md) | MIT |
| vite-readme | [vitejs/vite/README.md](https://raw.githubusercontent.com/vitejs/vite/82e7aa0374a15e1c67594557ab5893c91578f897/README.md) | MIT |
| svelte-readme | [sveltejs/svelte/README.md](https://raw.githubusercontent.com/sveltejs/svelte/356c8766a024d5982c276e898903fadaceaca960/README.md) | MIT |
| nuxt-readme | [nuxt/nuxt/README.md](https://raw.githubusercontent.com/nuxt/nuxt/2a81d4a628b8b4c8c844e8dcbfdcf7ae7a7a612e/README.md) | MIT |
| astro-readme | [withastro/astro/README.md](https://raw.githubusercontent.com/withastro/astro/5fe699c888d0423db75cac3f0939409d7eb28e37/README.md) | MIT |
| storybook-readme | [storybookjs/storybook/README.md](https://raw.githubusercontent.com/storybookjs/storybook/9b4e295a7f994b6496cb1fdd50b436dd64925cca/README.md) | MIT |
| deno-readme | [denoland/deno/README.md](https://raw.githubusercontent.com/denoland/deno/d7205acbed60f68414d1485407a5b50bc867131e/README.md) | MIT |
| react-readme | [facebook/react/README.md](https://raw.githubusercontent.com/facebook/react/a6b912fbe77f698ad43c922f206db0d4f4ad7485/README.md) | MIT |
| typescript-readme | [microsoft/TypeScript/README.md](https://raw.githubusercontent.com/microsoft/TypeScript/8d9b6da99ea7d4a8e7d906dd2532456dfe14e24f/README.md) | Apache-2.0 |
| vue-introduction | [vuejs/docs/src/guide/introduction.md](https://raw.githubusercontent.com/vuejs/docs/40aa88af0094f7bab4aaf786e55c748a6a251d88/src/guide/introduction.md) | MIT |
| vue-faq | [vuejs/docs/src/about/faq.md](https://raw.githubusercontent.com/vuejs/docs/40aa88af0094f7bab4aaf786e55c748a6a251d88/src/about/faq.md) | MIT |
| vue-community | [vuejs/docs/src/about/community-guide.md](https://raw.githubusercontent.com/vuejs/docs/40aa88af0094f7bab4aaf786e55c748a6a251d88/src/about/community-guide.md) | MIT |
| vite-troubleshooting | [vitejs/vite/docs/guide/troubleshooting.md](https://raw.githubusercontent.com/vitejs/vite/82e7aa0374a15e1c67594557ab5893c91578f897/docs/guide/troubleshooting.md) | MIT |
| node-contributing | [nodejs/node/doc/contributing/pull-requests.md](https://raw.githubusercontent.com/nodejs/node/b12bad4b1119608ba98dcfdcddb4fabaa3c93daf/doc/contributing/pull-requests.md) | MIT |
| rust-installation | [rust-lang/book/src/ch01-01-installation.md](https://raw.githubusercontent.com/rust-lang/book/1500248d8f230566e4ec9f27fcbb8fe9e2898ab1/src/ch01-01-installation.md) | MIT OR Apache-2.0 |
| rust-rfc-nll | [rust-lang/rfcs/text/2094-nll.md](https://raw.githubusercontent.com/rust-lang/rfcs/f63a7efbb9d83ae0616cf752c000cd3df4ca5d3e/text/2094-nll.md) | MIT OR Apache-2.0 |
| react-rfc-server-components | [reactjs/rfcs/text/0188-server-components.md](https://raw.githubusercontent.com/reactjs/rfcs/c15bc9df5afa8fd1dca6e5fd1c2ed073f7a9bd79/text/0188-server-components.md) | MIT |
| kubernetes-kep-in-place-resize | [kubernetes/enhancements/keps/sig-node/1287-in-place-update-pod-resources/README.md](https://raw.githubusercontent.com/kubernetes/enhancements/0c8d11e9a13e12d2ef75d2d78af5ac00d8189046/keps/sig-node/1287-in-place-update-pod-resources/README.md) | Apache-2.0 |
| node-api-fs | [nodejs/node/doc/api/fs.md](https://raw.githubusercontent.com/nodejs/node/b12bad4b1119608ba98dcfdcddb4fabaa3c93daf/doc/api/fs.md) | MIT |
| node-api-errors | [nodejs/node/doc/api/errors.md](https://raw.githubusercontent.com/nodejs/node/b12bad4b1119608ba98dcfdcddb4fabaa3c93daf/doc/api/errors.md) | MIT |
| node-api-stream | [nodejs/node/doc/api/stream.md](https://raw.githubusercontent.com/nodejs/node/b12bad4b1119608ba98dcfdcddb4fabaa3c93daf/doc/api/stream.md) | MIT |
| node-api-http | [nodejs/node/doc/api/http.md](https://raw.githubusercontent.com/nodejs/node/b12bad4b1119608ba98dcfdcddb4fabaa3c93daf/doc/api/http.md) | MIT |
| node-api-path | [nodejs/node/doc/api/path.md](https://raw.githubusercontent.com/nodejs/node/b12bad4b1119608ba98dcfdcddb4fabaa3c93daf/doc/api/path.md) | MIT |
| node-api-buffer | [nodejs/node/doc/api/buffer.md](https://raw.githubusercontent.com/nodejs/node/b12bad4b1119608ba98dcfdcddb4fabaa3c93daf/doc/api/buffer.md) | MIT |

## Reproduce

```bash
pnpm bench
```

The benchmark downloads pinned source revisions into `benchmarks/.cache` and reuses the cache on later runs. Use `node --expose-gc benchmarks/run.mjs` directly after building the SDK to optimize GC behavior.
