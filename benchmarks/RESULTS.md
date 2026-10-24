# FluxMark benchmark results

Generated at 2026-10-24T03:19:51.402Z with Node.js v24.19.0 on linux 7.0.0-38-generic, Intel(R) Core(TM) i7-14700KF. Samples: 11; exposed GC: yes.

## What is measured

Public Markdown sources are normalized into a common semantic subset of headings, paragraphs, blockquotes, simple lists, fenced code, links, inline emphasis and image references. The same normalized block tree is serialized as Markdown and FluxMark. The benchmark measures parsing and full semantic HTML string rendering with Markdown-it, marked and FluxMark.

Image references use native image syntax in both formats. Tables are retained; FluxMark uses a compact header row so column names appear once. Raw HTML is retained as native raw HTML nodes and rendered with allowHtml enabled on both sides. This is a compiler throughput benchmark, not a browser paint benchmark. Results depend on hardware, Node.js and package versions. The lightweight snarkdown parser is measured only on the table-free prose subset because it does not implement GFM tables.

The **rich** corpus contains nine public README/media pages chosen for dense links and image references. The **spec** corpus contains three authoritative Markdown technical specifications (Rust RFC, React RFC, Kubernetes KEP). The **prose** corpus contains six regular documentation chapters. The **reference** corpus adds six large Node.js API reference documents, including table-heavy pages. The **all** corpus combines all twenty-four sources.

## Source size

| Source | Group | Words | Images | Normalized Markdown chars | FluxMark chars | FluxMark delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| vue-core-readme | rich | 204 | 3 | 2,645 | 2,623 | -0.83% |
| vite-readme | rich | 135 | 3 | 2,816 | 2,803 | -0.46% |
| svelte-readme | rich | 176 | 2 | 1,651 | 1,642 | -0.55% |
| nuxt-readme | rich | 452 | 0 | 5,306 | 5,299 | -0.13% |
| astro-readme | rich | 159 | 25 | 4,961 | 4,817 | -2.9% |
| storybook-readme | rich | 625 | 26 | 17,130 | 17,024 | -0.62% |
| deno-readme | rich | 278 | 5 | 3,224 | 3,124 | -3.1% |
| react-readme | rich | 538 | 5 | 4,969 | 4,859 | -2.21% |
| typescript-readme | rich | 199 | 4 | 2,457 | 2,386 | -2.89% |
| vue-introduction | prose | 1,133 | 0 | 9,974 | 10,027 | +0.53% |
| vue-faq | prose | 1,369 | 0 | 9,475 | 9,423 | -0.55% |
| vue-community | prose | 858 | 0 | 6,000 | 5,936 | -1.07% |
| vite-troubleshooting | prose | 2,140 | 0 | 15,792 | 15,621 | -1.08% |
| node-contributing | prose | 3,943 | 0 | 25,456 | 25,324 | -0.52% |
| rust-installation | prose | 920 | 0 | 6,134 | 6,074 | -0.98% |
| rust-rfc-nll | spec | 13,371 | 0 | 83,272 | 83,158 | -0.14% |
| react-rfc-server-components | spec | 7,390 | 0 | 49,225 | 49,089 | -0.28% |
| kubernetes-kep-in-place-resize | spec | 11,620 | 0 | 88,349 | 87,870 | -0.54% |
| node-api-fs | reference | 28,864 | 0 | 225,412 | 224,780 | -0.28% |
| node-api-errors | reference | 13,308 | 0 | 114,387 | 114,762 | +0.33% |
| node-api-stream | reference | 17,847 | 0 | 133,056 | 133,493 | +0.33% |
| node-api-http | reference | 16,491 | 0 | 125,191 | 125,276 | +0.07% |
| node-api-path | reference | 1,773 | 0 | 14,437 | 14,416 | -0.15% |
| node-api-buffer | reference | 17,195 | 0 | 130,288 | 130,534 | +0.19% |
| **Total** | | **140,988** | | **1,081,653** | **1,080,406** | **-0.12%** |

## Results by source type

| Corpus | Documents | Words | Images | Tables | Source chars | Non-whitespace chars | Render vs Markdown-it | Render vs marked |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Link/media-rich public READMEs | 9 | 2,766 | 73 | 5 | -1.29% | -1.76% | 1.77× | 1.22× |
| Authoritative technical specifications | 3 | 32,381 | 0 | 0 | -0.33% | -0.55% | 1.23× | 1.32× |
| Prose-heavy documentation chapters | 6 | 10,363 | 0 | 0 | -0.58% | -0.79% | 1.27× | 1.25× |
| Large API and reference documents | 6 | 95,478 | 0 | 5 | +0.07% | -0.63% | 1.30× | 1.16× |
| All public documentation sources | 24 | 140,988 | 73 | 10 | -0.12% | -0.68% | 1.37× | 1.20× |

## Throughput

### Link/media-rich public READMEs

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 0.95 | 1.20 | 35.78 | 1.00× |
| markdown-it | 2.23 | 2.12 | 20.50 | 1.77× |
| marked | 1.27 | 1.46 | 29.76 | 1.22× |

FluxMark render speedup versus Markdown-it: **1.77×**
FluxMark render speedup versus marked: **1.22×**

### Authoritative technical specifications

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 4.59 | 5.51 | 38.46 | 1.00× |
| markdown-it | 6.29 | 6.76 | 31.43 | 1.23× |
| marked | 6.56 | 7.26 | 29.28 | 1.32× |

FluxMark render speedup versus Markdown-it: **1.23×**
FluxMark render speedup versus marked: **1.32×**

### Prose-heavy documentation chapters

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 1.48 | 1.73 | 40.27 | 1.00× |
| markdown-it | 2.12 | 2.20 | 31.82 | 1.27× |
| marked | 1.97 | 2.16 | 32.44 | 1.25× |
| snarkdown | — | 1.39 | 50.28 | 0.81× |

FluxMark render speedup versus Markdown-it: **1.27×**
FluxMark render speedup versus marked: **1.25×**

### Large API and reference documents

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 20.26 | 27.86 | 25.57 | 1.00× |
| markdown-it | 31.01 | 36.11 | 19.72 | 1.30× |
| marked | 28.24 | 32.19 | 22.12 | 1.16× |

FluxMark render speedup versus Markdown-it: **1.30×**
FluxMark render speedup versus marked: **1.16×**

### All public documentation sources

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 27.34 | 36.59 | 28.33 | 1.00× |
| markdown-it | 42.91 | 50.09 | 20.72 | 1.37× |
| marked | 38.51 | 44.01 | 23.58 | 1.20× |

FluxMark render speedup versus Markdown-it: **1.37×**
FluxMark render speedup versus marked: **1.20×**

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
