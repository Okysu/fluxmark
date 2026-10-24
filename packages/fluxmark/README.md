# FluxMark

A zero-backtracking FluxMark compiler with a typed AST, staged plugins and a semantic HTML renderer.

FluxMark is not a Markdown compatibility layer. Its indentation-based blocks, pipe modifiers, source locations and extension pipeline are designed for structured editors, documentation tools and interactive previews.

[Documentation](https://okysu.github.io/fluxmark/) · [Playground](https://okysu.github.io/fluxmark/playground) · [Language guide](https://okysu.github.io/fluxmark/guide/syntax) · [API reference](https://okysu.github.io/fluxmark/api/) · [GitHub](https://github.com/Okysu/fluxmark) · [简体中文](https://github.com/Okysu/fluxmark/blob/main/README.zh-CN.md)

![FluxMark Playground](https://raw.githubusercontent.com/Okysu/fluxmark/main/docs/public/playground.png)

## Features

- Deterministic block parsing and linear inline scanning without failed-match restarts.
- Typed block AST with one-based line/column locations and zero-based source ranges.
- Extension stages for block rules, pipe modifiers, AST transforms and HTML renderers.
- Mutable depth-first `walkAST` with `enter`, `leave`, `skip`, `remove` and `replace`.
- Semantic HTML with safe defaults, fine-grained renderer overrides and standalone CSS.
- Exact task source updates without reformatting the document.
- Native images with `![src|alt]`, optional alt text, lazy loading and URL validation.
- Documentation-embedded live examples that surface HTML, AST and compile timings.

## Compact and fast

On a reproducible 30-document public corpus of about 1.18 MB normalized Markdown, full parsing plus semantic HTML generation was about 1.24× faster than markdown-it and 1.11× faster than marked. On link-heavy READMEs the render advantage increased to about 1.6×.

Across the corpus, FluxMark used 1.47% fewer source characters. Compact header tables declare columns once, while sparse key-value tables remain available. Images and raw HTML use native nodes; raw HTML requires the explicit `allowHtml` renderer option.

See the [benchmark methodology and pinned public sources](https://github.com/Okysu/fluxmark/blob/main/benchmarks/RESULTS.md). Results depend on hardware and input shape, and the benchmark is not a DOM paint measurement.

## Installation

```bash
npm install fluxmark
```

```bash
pnpm add fluxmark
```

The SDK supports Node.js 18 or later and modern browsers. It has no runtime dependencies.

## Quick start

```ts
import {
  FluxMark,
  FluxMarkParser,
  FluxHtmlRenderer,
  walkAST,
  parseFluxMark,
  renderToHTML,
} from 'fluxmark'
import 'fluxmark/styles.css'

const source = `# Getting started
  FluxMark turns [structured text|b] into a typed AST.
  > [tip] One source, clear output
    Render the same document as semantic HTML.
  * [x] Install fluxmark
  * [ ] Build an interface
`

const ast = parseFluxMark(source)
const html = renderToHTML(source)

console.log(ast.children, ast.issues, html)
```

`parseFluxMark` supports plugins and runs their AST transforms. `renderToHTML` parses source and returns an `<article class="fx-document">` by default. To render an existing AST without parsing again:

```ts
const parser = new FluxMarkParser()
const document = parser.parse(source)
const html = new FluxHtmlRenderer().render(document)
```

The standalone parser does not run `FluxMark` AST transforms. Use a shared compiler when plugins must apply everywhere:

```ts
const flux = new FluxMark({ plugins: [] })
const parsed = flux.parse(source)
const html = flux.renderToHTML(parsed)
```

## Language syntax

Blocks are nested by physical indentation. A space is one indentation column; a tab is exactly two. Children must be indented beyond their parent.

```text
# Project status
  A paragraph with *bold*, _italic_, =marked text=, and ~deleted text~.
  Links use [pipe modifiers|https://example.com,?Optional tooltip].

  > [note] Callout title
    Nested callout content

  @ Release table
    - Package | Status | Owner
    - fluxmark | Stable | Ada
    - docs | Beta | Lin

  $ ts
    const ast = parseFluxMark(source)

  1. Parse
  2. Render
  * [ ] Unfinished task
  * [x] Completed task
  ---
```

| Construct | Syntax |
| --- | --- |
| Section | `#` through `######`, adjusted by section nesting depth |
| Callout | `> quote`, `> [note]`, `> [tip]`, `> [warn]`, `> [danger]` |
| Code block | `$` or `$ language`; following indented lines are code |
| Data table | `@ title`, then `- key: value | key: value` records |
| Unordered list | `- item`, `-- nested item`, or `* item` |
| Ordered list | `1. item`, `2. item`, `2.1. nested item` |
| Task | `* [ ] item` or `* [x] item` |
| Image | `![src\|alt]` (alt optional) |
| Escapes | `\*`, `\|`, `\]` and other ASCII punctuation |
| Raw HTML | Inline `!<tag>`, block `!html`; requires `allowHtml` |
| Horizontal rule | `---` or more hyphens on an otherwise empty line |
| Bold | `*text*` or `**text**` |
| Italic | `_text_` |
| Mark / strike | `=text=` / `~text~` |
| Inline code | `` `text` `` |

Pipe modifiers use `[content|modifier,modifier]`. Built-in aliases include `b`, `i`, `u`, `s`, `m`, `c` and their long names, three- or six-digit hex colors, HTTP(S)/mailto URLs, and `?tooltip`. Place a tooltip last because it consumes the remaining modifier text.

FluxMark does not use fenced Markdown code blocks, Markdown pipe tables or Markdown link syntax. Images use native `![src|alt]`; raw HTML uses explicit `!<tag>` and `!html` nodes and is escaped unless `allowHtml` is enabled. See the [complete syntax guide](https://okysu.github.io/fluxmark/guide/syntax).

## Default styles

Import the packaged stylesheet once:

```ts
import 'fluxmark/styles.css'
```

For runtimes without CSS imports, generate a style element or write the same CSS to a file:

```ts
import { getFluxDefaultStyles } from 'fluxmark'

const css = getFluxDefaultStyles()
```

`getFluxDefaultStyles()` takes no arguments. The default class prefix is `fx`; if `classPrefix` is changed, provide matching CSS selectors.

## Plugins

A `FluxPluginDefinition` can participate in four stages:

| Stage | Extension point | Purpose |
| --- | --- | --- |
| Block parsing | `blockRules` | Match physical lines and return block nodes |
| Inline parsing | `pipeModifiers` | Handle modifiers and token metadata |
| AST transformation | `astTransforms` | Mutate or replace the document |
| Rendering | `htmlRenderers` | Override block or inline HTML |

`calloutVariants` additionally registers custom callout names.

```ts
import { FluxMark, createFluxNodeBase, walkAST } from 'fluxmark'
import type { FluxPluginDefinition } from 'fluxmark'

const mathPlugin: FluxPluginDefinition = {
  name: 'math',
  blockRules: [
    {
      name: 'math',
      priority: 120,
      parse({ line }) {
        if (!line.content.startsWith('! math ')) return null
        return {
          node: {
            ...createFluxNodeBase(line),
            type: 'CustomBlock',
            name: 'math',
            content: line.content.slice(7),
            attributes: {},
            children: [],
          },
        }
      },
    },
  ],
  pipeModifiers: {
    badge(modifier, { attributes }) {
      attributes.kind = modifier
      return true
    },
  },
  astTransforms: [
    (document) => {
      walkAST(document, {
        Section: {
          enter(node) {
            node.id = node.title.map((token) => token.content).join('-').toLowerCase()
          },
        },
      })
    },
  ],
  htmlRenderers: {
    CustomBlock(node, _childrenHtml, helper) {
      if (node.name !== 'math') return helper.defaultRender()
      return `<output data-kind="math">${helper.escapeHtml(node.content)}</output>`
    },
  },
}

const flux = new FluxMark({ plugins: [mathPlugin] })
const html = flux.renderToHTML('# Formula\n  ! math x^2')
```

Rules with larger `priority` run earlier; custom rules default to 100. `consumed` defaults to one physical line and must be a positive integer. A pipe handler returns `false` to decline, `true` or `undefined` to consume, or a partial style object to merge and consume. It can also write token `attributes`.

AST transforms run in registration order and may return a replacement `FluxDocument` or return nothing after mutation. Register definitions with `new FluxMark({ plugins })` or `flux.use(plugin)`. Typed factories use `flux.use(factory, options)`. Later renderer overrides win, and renderer options supplied at the call site win over plugin overrides.

See the [plugin guide](https://okysu.github.io/fluxmark/guide/plugins) for helper contracts and composition details.

## Walking and transforming the AST

`walkAST` mutates the input document in place and also returns its root. Clone shared AST data first when the caller needs the original.

```ts
import { walkAST } from 'fluxmark'

walkAST(ast, {
  Section: {
    enter(node, _parent, _index, context) {
      node.id = `section-${node.line}`
      if (node.title[0]?.content === 'Internal') context.skip()
    },
    leave(node) {
      console.log(`Finished ${node.id}`)
    },
  },
  Paragraph: {
    enter(node, _parent, _index, context) {
      if (node.tokens.every((token) => token.content.trim() === '')) context.remove()
    },
  },
})
```

Visitor keys are node types or `'*'`. Wildcard `enter` runs before typed `enter`; typed `leave` runs before wildcard `leave`. Callbacks receive `(node, parent, index, context)`, where `context.path` contains ancestors from the root to the parent.

`context` exposes:

| Method | Behavior |
| --- | --- |
| `skip()` | Skip the current node's children but continue with later siblings |
| `remove()` | Remove the current node from its parent |
| `replace(node)` | Replace the current node in place and traverse the replacement's children |

See the [walker guide](https://okysu.github.io/fluxmark/guide/walker) for traversal order and structural constraints.

## HTML renderer overrides

Overrides can replace output or wrap the default implementation. Node overrides receive `(node, childrenHtml, helper)`; `helper.defaultRender()` renders the current node with its already-rendered children.

```ts
import { FluxHtmlRenderer } from 'fluxmark'

const renderer = new FluxHtmlRenderer({
  overrides: {
    Section(node, _childrenHtml, helper) {
      return `<div class="section-shell" data-level="${node.level}">${helper.defaultRender()}</div>`
    },
    InlineToken(token, defaultRender) {
      return token.style.customModifiers.includes('kbd')
        ? `<span class="key-shell">${defaultRender()}</span>`
        : defaultRender()
    },
  },
})

const html = renderer.render(ast)
```

Node helpers include `escapeHtml`, `escapeAttribute`, `safeUrl`, `renderInline`, `renderChildren` and `defaultRender`. The inline `defaultRender(token?)` can render the current token or an explicitly supplied token. Instance overrides passed through `FluxMark.createHtmlRenderer` or `flux.renderToHTML` take precedence over plugin renderers.

The [renderer guide](https://okysu.github.io/fluxmark/guide/renderers) documents all options and the default semantic structure.

## Task toggles

HTML task checkboxes include `data-flux-task`, `data-flux-line` and `data-flux-offset`. The helper changes only one state character:

```ts
import { renderToHTML, toggleTaskInSource } from 'fluxmark'

let source = '# Tasks\n  * [ ] Ship docs\n'
source = toggleTaskInSource(source, 2, true)
const html = renderToHTML(source)

document.addEventListener('change', (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  if (!target.matches('[data-flux-task]')) return
  const line = Number(target.dataset.fluxLine)
  if (!Number.isInteger(line)) return
  source = toggleTaskInSource(source, line, target.checked)
  document.querySelector('#app')!.innerHTML = renderToHTML(source)
})
```

The function leaves non-task lines unchanged and preserves every other byte of source text.

## Security and complexity

- HTML text, attributes, code and table labels are escaped by default.
- `safeFluxUrl` allows relative URLs plus `http:`, `https:`, `mailto:` and `tel:`; dangerous protocols are rejected.
- Renderer overrides and plugins execute trusted host code. Use helper escaping for untrusted values.
- AST parsing is single-pass with precomputed inline delimiter and bracket pairs. Plugin rules, repeated AST walks and output serialization add their own costs.
- Set input limits appropriate to your application. HTML output can be large even when parsing is linear.

See the [renderer guide](https://okysu.github.io/fluxmark/guide/renderers#security-and-trusted-overrides) for the security boundary.

## API summary

| Export | Purpose |
| --- | --- |
| `FluxMark` | Reusable compiler with plugins, transforms and renderer factories |
| `FluxMarkParser` | Standalone block and inline parser |
| `FluxInlineParser` | Standalone inline parser |
| `parseFluxMark` | One-shot compiled parse with plugins |
| `parseFluxMarkDocument` | Parser-only convenience function |
| `FluxHtmlRenderer` | Semantic HTML renderer with overrides |
| `renderToHTML` | Parse source and render HTML |
| `toHTML` | Render an existing `FluxDocument` |
| `getFluxDefaultStyles` | Standalone default stylesheet |
| `walkAST` | Mutable depth-first AST visitor |
| `FluxASTWalker` | Reusable visitor wrapper |
| `countASTNodes` | Count visited AST nodes |
| `toggleTaskInSource` | Exact one-line task state update |
| `safeFluxUrl` | URL protocol allowlist |
| `createFluxNodeBase` | Create standard extension-node position fields |

Important option types include `FluxMarkOptions`, `FluxParserOptions`, `FluxRenderToHtmlOptions`, `FluxHtmlRendererOptions`, `FluxPluginDefinition`, `FluxVisitor` and all AST node interfaces. See the [API reference](https://okysu.github.io/fluxmark/api/) for signatures and field tables.

## License

[MIT](https://github.com/Okysu/fluxmark/blob/main/LICENSE) © FluxMark contributors
