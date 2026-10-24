# Getting started

FluxMark is a TypeScript package for parsing structured text into a typed AST and rendering that AST as semantic HTML. The SDK has no runtime dependencies.

## Installation

::: code-group

```bash [pnpm]
pnpm add fluxmark
```

```bash [npm]
npm install fluxmark
```

```bash [yarn]
yarn add fluxmark
```

:::

The parser and HTML renderer run in Node.js 18 or later and in modern browsers. Repository development uses Node.js 20.19 or later and the pnpm version pinned in `packageManager`.

## Parse and render HTML

```ts
import { parseFluxMark, renderToHTML } from 'fluxmark'
import 'fluxmark/styles.css'

const source = `# Hello FluxMark
  Parse [structured text|b] into a typed AST.
  > [tip] Reuse one compiler
    Plugins and renderers can share the same AST.
  * [x] Install
  * [ ] Render
`

const ast = parseFluxMark(source)
const html = renderToHTML(source)

console.log(ast.type, ast.issues)
console.log(html)
```

`parseFluxMark` returns a `FluxDocument` with block `children`, parse `issues`, and source locations. `renderToHTML` parses the source, runs the AST transforms of any plugins, and returns semantic HTML wrapped in `<article class="fx-document">` by default.

In a browser, render the source and mount the result:

```ts
import { renderToHTML } from 'fluxmark'

const html = renderToHTML('# Hello browser\n  Mounted with renderToHTML.')
const app = document.querySelector<HTMLElement>('#app')
if (app === null) throw new Error('Missing #app container')

app.innerHTML = html
```

To render an existing AST without parsing it again, use `FluxHtmlRenderer` or `toHTML`:

```ts
import { FluxHtmlRenderer, parseFluxMark, toHTML } from 'fluxmark'

const ast = parseFluxMark('# Renderers\n  One AST, two HTML entry points.')
const withWrapper = new FluxHtmlRenderer().render(ast)
const withoutWrapper = toHTML(ast, { documentWrapper: false })

console.log(withWrapper, withoutWrapper)
```

## Main entry points

The main entry point exposes the compiler, its staged components, and function-style helpers:

```ts
import {
  FluxMark,
  FluxMarkParser,
  FluxHtmlRenderer,
  walkAST,
  parseFluxMark,
  renderToHTML,
} from 'fluxmark'
```

- `FluxMark` combines parser options, plugins, and renderer overrides for reuse.
- `FluxMarkParser` parses source into an AST without running `FluxMark` AST transforms.
- `FluxHtmlRenderer` renders an existing `FluxDocument` as HTML.
- `walkAST` traverses and mutates an AST in place.
- `parseFluxMark` performs a one-off parse and supports plugins.
- `renderToHTML` produces HTML directly from source text.

The package uses named exports. Import the classes and functions from `fluxmark` rather than relying on a default export.

## Reuse a compiler instance

Create a compiler when parsing and rendering should share plugins and options:

```ts
import { FluxMark } from 'fluxmark'
import type { FluxPluginDefinition } from 'fluxmark'

const sectionIds: FluxPluginDefinition = {
  name: 'section-ids',
  astTransforms: [
    (document) => {
      for (const node of document.children) {
        if (node.type === 'Section') node.id = `section-${node.line}`
      }
    },
  ],
}

const flux = new FluxMark({
  plugins: [sectionIds],
  onIssue(issue) {
    console.warn(`${issue.severity} at ${issue.line}:${issue.column}: ${issue.message}`)
  },
})

const ast = flux.parse('# Introduction\n  Reusable configuration')
const html = flux.renderToHTML(ast)
const renderer = flux.createHtmlRenderer({ classPrefix: 'fx' })

console.log(html, renderer.render(ast))
```

`flux.use(plugin)` appends a plugin definition and returns the same instance. A plugin factory receives typed options through `flux.use(factory, options)`. `createHtmlRenderer` merges plugin renderer overrides with call-site options; call-site overrides take precedence.

`flux.parse` runs registered AST transforms. Use `flux.createParser().parse(source)` when you need the same block rules, pipe modifiers, callout variants, and issue handler without the transforms.

## Default styles

Bundler projects can import the packaged stylesheet:

```ts
import 'fluxmark/styles.css'
```

The file maps to `dist/fluxmark.css` in the published package and uses the `fx` class prefix by default. In environments without CSS imports, obtain the same CSS as a string:

```ts
import { getFluxDefaultStyles } from 'fluxmark'

const style = document.createElement('style')
style.textContent = getFluxDefaultStyles()
document.head.append(style)
```

`getFluxDefaultStyles()` takes no arguments. If you change `classPrefix`, the selectors in the default CSS do not change with it; provide matching styles for the new prefix.

## Toggle task state

`toggleTaskInSource(source, line, checked?)` changes only the state character of one task line. The line number is one-based. When `checked` is omitted, the current state is inverted. A target that is not a task line returns the source unchanged, and the rest of the document is not reformatted.

```ts
import { toggleTaskInSource } from 'fluxmark'

let source = `# Tasks
  * [ ] Write documentation
`

source = toggleTaskInSource(source, 2, true)
console.log(source)
```

HTML task checkboxes include `data-flux-task`, `data-flux-line`, and `data-flux-offset`. Listen for `change` on a container to write the interaction back to source and render again:

```ts
import { renderToHTML, toggleTaskInSource } from 'fluxmark'

const container = document.querySelector<HTMLElement>('#app')
if (container === null) throw new Error('Missing #app container')

let source = `# Tasks
  * [ ] Write documentation
  * [x] Test parser
`

const render = (): void => {
  container.innerHTML = renderToHTML(source)
}

container.addEventListener('change', (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  if (!target.matches('[data-flux-task]')) return

  const line = Number(target.dataset.fluxLine)
  if (!Number.isInteger(line)) return

  source = toggleTaskInSource(source, line, target.checked)
  render()
})

render()
```

`data-flux-offset` is the absolute source offset of the task state character, matching `taskMarkerOffset` in the AST. Use it when an editor needs offset-based updates, and always verify that the target character is still a task state character.

## Next steps

- Learn the [language syntax](/guide/syntax), including indentation and pipe modifiers.
- Extend parsing and rendering with [plugins](/guide/plugins).
- Traverse and transform documents with the [AST walker](/guide/walker).
- Review [renderers](/guide/renderers) and the [API reference](/api/).
- Try examples in the [Playground](/playground).
