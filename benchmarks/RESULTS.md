# FluxMark benchmark results

Generated at 2026-10-24T04:56:49.929Z with Node.js v24.19.0 on linux 7.0.0-38-generic, Intel(R) Core(TM) i7-14700KF. Samples: 11; exposed GC: yes.

## What is measured

Public Markdown sources are normalized into a common semantic subset of headings, paragraphs, blockquotes, simple lists, fenced code, links, inline emphasis and image references. The same normalized block tree is serialized as Markdown and FluxMark. The benchmark measures parsing and full semantic HTML string rendering with Markdown-it, marked and FluxMark.

Image references use native image syntax in both formats. Tables are retained; FluxMark uses a compact header row so column names appear once. Raw HTML is retained as native raw HTML nodes and rendered with allowHtml enabled on both sides. This is a compiler throughput benchmark, not a browser paint benchmark. Results depend on hardware, Node.js and package versions. The lightweight snarkdown parser is measured only on the table-free prose subset because it does not implement GFM tables.

The **rich** corpus contains fifteen public README/media pages chosen for dense links and image references. The **spec** corpus contains three authoritative Markdown technical specifications (Rust RFC, React RFC, Kubernetes KEP). The **prose** corpus contains six regular documentation chapters. The **reference** corpus adds six large Node.js API reference documents, including table-heavy pages. The **all** corpus combines all thirty sources.

## Source size

| Source | Group | Words | Images | Normalized Markdown chars | FluxMark chars | FluxMark delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| vue-core-readme | rich | 204 | 3 | 2,645 | 2,623 | -0.83% |
| vite-readme | rich | 137 | 3 | 2,923 | 2,833 | -3.08% |
| svelte-readme | rich | 176 | 2 | 1,709 | 1,677 | -1.87% |
| nuxt-readme | rich | 452 | 0 | 5,484 | 5,452 | -0.58% |
| astro-readme | rich | 159 | 25 | 5,670 | 5,464 | -3.63% |
| storybook-readme | rich | 626 | 26 | 17,903 | 17,723 | -1.01% |
| deno-readme | rich | 279 | 5 | 3,253 | 3,154 | -3.04% |
| react-readme | rich | 539 | 5 | 4,984 | 4,871 | -2.27% |
| typescript-readme | rich | 200 | 4 | 2,499 | 2,422 | -3.08% |
| kubernetes-readme | rich | 395 | 2 | 3,950 | 3,895 | -1.39% |
| go-readme | rich | 170 | 1 | 1,441 | 1,432 | -0.62% |
| rust-readme | rich | 242 | 0 | 3,121 | 3,085 | -1.15% |
| tauri-readme | rich | 476 | 9 | 5,057 | 4,929 | -2.53% |
| pytorch-readme | rich | 2,565 | 2 | 23,386 | 22,877 | -2.18% |
| transformers-readme | rich | 1,285 | 0 | 16,433 | 16,437 | +0.02% |
| vue-introduction | prose | 1,136 | 0 | 10,095 | 10,148 | +0.53% |
| vue-faq | prose | 1,374 | 0 | 9,821 | 9,738 | -0.85% |
| vue-community | prose | 858 | 0 | 6,049 | 5,976 | -1.21% |
| vite-troubleshooting | prose | 2,142 | 0 | 16,211 | 15,418 | -4.89% |
| node-contributing | prose | 3,953 | 0 | 27,038 | 26,791 | -0.91% |
| rust-installation | prose | 920 | 0 | 6,134 | 6,112 | -0.36% |
| rust-rfc-nll | spec | 13,373 | 0 | 83,292 | 83,840 | +0.66% |
| react-rfc-server-components | spec | 7,395 | 0 | 50,337 | 49,803 | -1.06% |
| kubernetes-kep-in-place-resize | spec | 11,629 | 0 | 91,568 | 91,615 | +0.05% |
| node-api-fs | reference | 28,869 | 0 | 231,842 | 230,485 | -0.59% |
| node-api-errors | reference | 13,320 | 0 | 119,784 | 117,014 | -2.31% |
| node-api-stream | reference | 17,855 | 0 | 142,027 | 137,749 | -3.01% |
| node-api-http | reference | 16,494 | 0 | 131,867 | 128,252 | -2.74% |
| node-api-path | reference | 1,773 | 0 | 14,866 | 14,803 | -0.42% |
| node-api-buffer | reference | 17,197 | 0 | 135,051 | 132,488 | -1.9% |
| **Total** | | **146,193** | | **1,176,498** | **1,159,164** | **-1.47%** |

## Results by source type

| Corpus | Documents | Words | Images | Tables | Source chars | Non-whitespace chars | Render vs Markdown-it | Render vs marked |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Link/media-rich public READMEs | 15 | 7,905 | 87 | 7 | -1.58% | -2.15% | 1.55× | 1.16× |
| Authoritative technical specifications | 3 | 32,397 | 0 | 0 | +0.03% | -0.11% | 1.11× | 1.19× |
| Prose-heavy documentation chapters | 6 | 10,383 | 0 | 0 | -1.55% | -1.91% | 1.15× | 1.12× |
| Large API and reference documents | 6 | 95,508 | 0 | 5 | -1.89% | -2.89% | 1.16× | 1.13× |
| All public documentation sources | 30 | 146,193 | 87 | 12 | -1.47% | -2.25% | 1.24× | 1.11× |

## Throughput

### Link/media-rich public READMEs

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 2.27 | 2.88 | 32.89 | 1.00× |
| markdown-it | 4.84 | 4.47 | 21.52 | 1.55× |
| marked | 2.96 | 3.34 | 28.78 | 1.16× |

FluxMark render speedup versus Markdown-it: **1.55×**
FluxMark render speedup versus marked: **1.16×**

### Authoritative technical specifications

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 5.39 | 6.52 | 33.01 | 1.00× |
| markdown-it | 6.83 | 7.26 | 29.61 | 1.11× |
| marked | 6.98 | 7.77 | 27.67 | 1.19× |

FluxMark render speedup versus Markdown-it: **1.11×**
FluxMark render speedup versus marked: **1.19×**

### Prose-heavy documentation chapters

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 1.80 | 2.10 | 33.69 | 1.00× |
| markdown-it | 2.32 | 2.42 | 29.69 | 1.15× |
| marked | 2.12 | 2.36 | 30.41 | 1.12× |
| snarkdown | — | 2.10 | 34.20 | 1.00× |

FluxMark render speedup versus Markdown-it: **1.15×**
FluxMark render speedup versus marked: **1.12×**

### Large API and reference documents

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 23.52 | 30.67 | 23.67 | 1.00× |
| markdown-it | 33.62 | 35.72 | 20.72 | 1.16× |
| marked | 29.94 | 34.79 | 21.27 | 1.13× |

FluxMark render speedup versus Markdown-it: **1.16×**
FluxMark render speedup versus marked: **1.13×**

### All public documentation sources

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
| FluxMark | 33.31 | 45.73 | 24.20 | 1.00× |
| markdown-it | 48.53 | 56.67 | 19.82 | 1.24× |
| marked | 43.18 | 50.58 | 22.21 | 1.11× |

FluxMark render speedup versus Markdown-it: **1.24×**
FluxMark render speedup versus marked: **1.11×**

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
| kubernetes-readme | [kubernetes/kubernetes/README.md](https://raw.githubusercontent.com/kubernetes/kubernetes/2d50144abf8fdcc6a75caeae420194f5af7db892/README.md) | Apache-2.0 |
| go-readme | [golang/go/README.md](https://raw.githubusercontent.com/golang/go/c4bf0b94ba5bff279eb7b8864ac77971a874efe0/README.md) | BSD-3-Clause |
| rust-readme | [rust-lang/rust/README.md](https://raw.githubusercontent.com/rust-lang/rust/9cd159cfa5b56207cfecf70fd8bd213558243c23/README.md) | MIT OR Apache-2.0 |
| tauri-readme | [tauri-apps/tauri/README.md](https://raw.githubusercontent.com/tauri-apps/tauri/c464ef928c35d7eedd64bcd5df16b62b3393b7fa/README.md) | MIT OR Apache-2.0 |
| pytorch-readme | [pytorch/pytorch/README.md](https://raw.githubusercontent.com/pytorch/pytorch/be18a70702ba6006bb7fed68c490f80e1f3168c7/README.md) | BSD-3-Clause |
| transformers-readme | [huggingface/transformers/README.md](https://raw.githubusercontent.com/huggingface/transformers/50e35cc0ca18ec19b80653690de553e6decf74f5/README.md) | Apache-2.0 |
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
